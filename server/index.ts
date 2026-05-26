import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not set. Server will not persist data.");
}
if (!JWT_SECRET) {
  console.error("JWT_SECRET not set. Authentication will fail.");
  process.exit(1);
}

// Register all three models so populate() works
mongoose.models.User || mongoose.model("User", new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    username: { type: String, default: "" },
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
));

const Message = mongoose.models.Message || mongoose.model("Message", new mongoose.Schema(
  {
    content: { type: String, default: "" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    type: { type: String, enum: ["text", "image", "audio"], default: "text" },
    fileUrl: { type: String, default: "" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
));

const Room = mongoose.models.Room || mongoose.model("Room", new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
));

// In-memory fallback stores for when MongoDB is down
const inMemoryRooms = new Map<string, { code: string; id: string }>();
const roomUsers = new Map<string, Set<string>>();
const userSockets = new Map<string, Set<string>>(); // userId → Set<socketId>

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory at", uploadsDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use("/uploads", express.static(uploadsDir));

app.post("/api/upload", upload.single("file"), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }
  const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

app.get("/api/messages", async (req: any, res: any) => {
  try {
    const { roomCode } = req.query;
    if (!roomCode) {
      return res.status(400).json({ error: "roomCode query param required" });
    }
    const room = await Room.findOne({ code: roomCode as string });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    const messages = await Message.find({ room: room._id })
    .populate("sender", "email username avatar")
    .sort({ createdAt: 1 })
    .lean();
    res.json({ messages });
  } catch (err) {
    console.error("GET_MESSAGES_ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string; email: string };
    (socket as any).userId = decoded.userId;
    (socket as any).email = decoded.email;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User ${(socket as any).email} connected`);
  const uid = (socket as any).userId;
  if (!userSockets.has(uid)) userSockets.set(uid, new Set());
  userSockets.get(uid)!.add(socket.id);

  socket.on("create-room", () => {
    let code: string;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (inMemoryRooms.has(code));
    const room = { code, id: `in-memory-${code}` };
    inMemoryRooms.set(code, room);
    socket.join(code);
    (socket as any).currentRoom = code;
    if (!roomUsers.has(code)) roomUsers.set(code, new Set());
    roomUsers.get(code)!.add((socket as any).userId);
    socket.emit("room-created", room);
  });

  socket.on("join-room", async (roomCode: string) => {
    try {
      let roomData: { code: string; id: string } | null = null;
      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        const room = await Room.findOne({ code: roomCode });
        if (room) {
          roomData = { code: roomCode, id: room._id.toString() };
        }
      }
      if (!roomData) {
        const memRoom = inMemoryRooms.get(roomCode);
        if (memRoom) roomData = memRoom;
      }
      if (!roomData) {
        socket.emit("error", "Room not found");
        return;
      }
      socket.join(roomCode);
      (socket as any).currentRoom = roomCode;
      socket.emit("room-joined", roomData);

      if (!roomUsers.has(roomCode)) roomUsers.set(roomCode, new Set());
      roomUsers.get(roomCode)!.add((socket as any).userId);
      const participants = Array.from(roomUsers.get(roomCode)!);
      io.to(roomCode).emit("user-joined", {
        userId: (socket as any).userId,
        email: (socket as any).email,
        participants,
      });
    } catch (err) {
      console.error("JOIN_ROOM_SOCKET_ERROR:", err);
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("leave-room", () => {
    const roomCode = (socket as any).currentRoom;
    if (roomCode) {
      socket.leave(roomCode);
      const users = roomUsers.get(roomCode);
      if (users) {
        users.delete((socket as any).userId);
        if (users.size === 0) roomUsers.delete(roomCode);
      }
      io.to(roomCode).emit("user-left", { userId: (socket as any).userId });
      (socket as any).currentRoom = null;
    }
  });

  socket.on("friend-chat-invite", (data: { friendUserId: string; roomCode: string }) => {
    const sockets = userSockets.get(data.friendUserId);
    if (sockets) {
      for (const sid of sockets) {
        io.to(sid).emit("chat-invite", {
          from: { userId: (socket as any).userId, email: (socket as any).email },
          roomCode: data.roomCode,
        });
      }
    }
  });

  socket.on("send-message", async (data: { roomCode: string; content?: string; type?: string; fileUrl?: string }) => {
    try {
      const { roomCode, content = "", type = "text", fileUrl = "" } = data;
      const senderId = (socket as any).userId;

      const connectedUsers = roomUsers.get(roomCode);
      const others: string[] = [];
      if (connectedUsers) {
        for (const uid of connectedUsers) {
          if (uid !== senderId) others.push(uid);
        }
      }

      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        try {
          const room = await Room.findOne({ code: roomCode });
          if (room) {
            const saved = await Message.create({
              content,
              sender: senderId,
              room: room._id,
              type,
              fileUrl,
              readBy: others,
            });
            const populated = await Message.findById(saved._id)
              .populate("sender", "email username avatar")
              .lean();
            io.to(roomCode).emit("new-message", populated);
            return;
          }
        } catch (dbErr) {
          console.error("DB save failed, sending in-memory:", dbErr);
        }
      }

      const msg = {
        _id: new mongoose.Types.ObjectId().toString(),
        content,
        sender: { _id: senderId, email: (socket as any).email, avatar: "" },
        room: roomCode,
        type,
        fileUrl,
        readBy: others,
        createdAt: new Date().toISOString(),
      };
      io.to(roomCode).emit("new-message", msg);
    } catch (err) {
      console.error("SEND_MESSAGE_ERROR:", err);
      socket.emit("error", "Failed to send message");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${(socket as any).email} disconnected`);
    const uid = (socket as any).userId;
    const sockets = userSockets.get(uid);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) userSockets.delete(uid);
    }
    const roomCode = (socket as any).currentRoom;
    if (roomCode) {
      socket.leave(roomCode);
      const users = roomUsers.get(roomCode);
      if (users) {
        users.delete(uid);
        if (users.size === 0) roomUsers.delete(roomCode);
      }
      io.to(roomCode).emit("user-left", { userId: uid });
    }
  });
});

// HTTP endpoint for Next.js API to emit socket events to specific users
app.post("/api/emit", express.json(), (req: any, res: any) => {
  const { userId, event, data } = req.body;
  if (!userId || !event) {
    return res.status(400).json({ error: "userId and event required" });
  }
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
    }
  }
  res.json({ ok: true });
});

async function start() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("Server DB connected");
    } catch (err) {
      console.error("MongoDB connection failed. Server will run without persistence.", err);
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
}

start();
