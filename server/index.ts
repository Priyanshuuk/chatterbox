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
import "../src/model/User";
import { Message } from "../src/model/Messages";
import { Room } from "../src/model/Room";

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

// Explicit tracking for reliable message delivery
const inMemoryRooms = new Map<string, { code: string; id: string }>();
const roomUsers = new Map<string, Set<string>>();       // roomCode → Set<userId>
const userSockets = new Map<string, Set<string>>();      // userId → Set<socketId>
const roomSockets = new Map<string, Set<string>>();      // roomCode → Set<socketId>

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

// Online status check endpoint
app.get("/api/online", (req: any, res: any) => {
  const userIdsParam = (req.query.userIds as string) || "";
  const userIds = userIdsParam.split(",").filter(Boolean);
  const status: Record<string, boolean> = {};
  for (const uid of userIds) {
    status[uid] = userSockets.has(uid) && (userSockets.get(uid)?.size ?? 0) > 0;
  }
  res.json({ online: status });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

function broadcastToRoom(roomCode: string, event: string, data: any) {
  const sockets = roomSockets.get(roomCode);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
    }
  }
}

// Cleanup expired session rooms every 15 seconds
async function cleanupExpiredRooms() {
  if (!MONGODB_URI || mongoose.connection.readyState !== 1) return;
  try {
    const now = new Date();
    const expired = await Room.find({ expiresAt: { $lte: now, $ne: null } });
    for (const room of expired) {
      const code = room.code;
      // Notify all connected users in this room
      broadcastToRoom(code, "room-expired", { message: "This session room has expired" });
      // Remove from in-memory tracking
      inMemoryRooms.delete(code);
      roomUsers.delete(code);
      roomSockets.delete(code);
      // Delete all messages and the room
      await Message.deleteMany({ room: room._id });
      await Room.findByIdAndDelete(room._id);
      console.log(`Expired room ${code} cleaned up`);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string; email: string; username?: string };
    (socket as any).userId = decoded.userId;
    (socket as any).email = decoded.email;
    (socket as any).username = decoded.username || "";
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  const uid = (socket as any).userId;
  const wasOffline = !userSockets.has(uid) || (userSockets.get(uid)?.size ?? 0) === 0;

  if (!userSockets.has(uid)) userSockets.set(uid, new Set());
  userSockets.get(uid)!.add(socket.id);

  // Broadcast online status to all rooms this user is part of
  if (wasOffline) {
    for (const [code, users] of roomUsers) {
      if (users.has(uid)) {
        broadcastToRoom(code, "user-online", { userId: uid });
      }
    }
  }

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
    roomUsers.get(code)!.add(uid);
    if (!roomSockets.has(code)) roomSockets.set(code, new Set());
    roomSockets.get(code)!.add(socket.id);
    socket.emit("room-created", room);
  });

  socket.on("join-room", async (roomCode: string) => {
    try {
      let roomData: { code: string; id: string } | null = null;
      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        const room = await Room.findOne({ code: roomCode });
        if (room) {
          roomData = { code: roomCode, id: room._id.toString() } as any;
          if (room.expiresAt) (roomData as any).expiresAt = room.expiresAt;
          if (room.maxParticipants) (roomData as any).maxParticipants = room.maxParticipants;
          if (room.creator) (roomData as any).creator = room.creator.toString();
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
      roomUsers.get(roomCode)!.add(uid);
      if (!roomSockets.has(roomCode)) roomSockets.set(roomCode, new Set());
      roomSockets.get(roomCode)!.add(socket.id);
      const participants = Array.from(roomUsers.get(roomCode)!);

      // Send historical messages via socket for reliable delivery
      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        try {
          const room = await Room.findOne({ code: roomCode });
          if (room) {
            const msgs = await Message.find({ room: room._id })
              .populate("sender", "email username avatar")
              .sort({ createdAt: 1 })
              .lean();
            socket.emit("room-messages", msgs);
          }
        } catch (err) {
          console.error("Failed to load room messages:", err);
        }
      }

      broadcastToRoom(roomCode, "user-joined", {
        userId: uid,
        email: (socket as any).email,
        username: (socket as any).username,
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
      const sockSet = roomSockets.get(roomCode);
      if (sockSet) {
        sockSet.delete(socket.id);
        if (sockSet.size === 0) roomSockets.delete(roomCode);
      }
      const users = roomUsers.get(roomCode);
      if (users) {
        users.delete(uid);
        if (users.size === 0) roomUsers.delete(roomCode);
      }
      broadcastToRoom(roomCode, "user-left", { userId: uid });
      (socket as any).currentRoom = null;
    }
  });

  socket.on("remove-user", async (data: { targetUserId: string; roomCode: string }) => {
    try {
      const { targetUserId, roomCode } = data;
      // Verify the requester is the room creator
      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        const room = await Room.findOne({ code: roomCode });
        if (!room) { socket.emit("error", "Room not found"); return; }
        if (room.creator?.toString() !== uid) { socket.emit("error", "Only the room creator can remove users"); return; }
        if (targetUserId === uid) { socket.emit("error", "You cannot remove yourself"); return; }

        const targetObjId = new mongoose.Types.ObjectId(targetUserId);
        room.participants = room.participants.filter((p: any) => !p.equals(targetObjId));
        await room.save();

        // Remove from in-memory tracking
        const sockSet = roomSockets.get(roomCode);
        if (sockSet) {
          const targetSocks = userSockets.get(targetUserId);
          if (targetSocks) {
            for (const sid of targetSocks) {
              sockSet.delete(sid);
              io.to(sid).emit("removed-from-room", { roomCode, message: "You were removed from the room" });
            }
          }
        }
        const users = roomUsers.get(roomCode);
        if (users) {
          users.delete(targetUserId);
          if (users.size === 0) roomUsers.delete(roomCode);
        }
        broadcastToRoom(roomCode, "user-left", { userId: targetUserId });
      } else {
        socket.emit("error", "Cannot remove user without database");
      }
    } catch (err) {
      console.error("REMOVE_USER_ERROR:", err);
      socket.emit("error", "Failed to remove user");
    }
  });

  socket.on("delete-room", async (roomCode: string) => {
    try {
      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        const room = await Room.findOne({ code: roomCode });
        if (!room) { socket.emit("error", "Room not found"); return; }
        if (room.creator?.toString() !== uid) { socket.emit("error", "Only the room creator can delete the room"); return; }

        // Delete all messages and the room
        await Message.deleteMany({ room: room._id });
        await Room.findByIdAndDelete(room._id);

        // Notify all connected users
        broadcastToRoom(roomCode, "room-deleted", { message: "This room has been deleted by the creator" });

        // Clean up in-memory tracking
        const sockets = roomSockets.get(roomCode);
        if (sockets) {
          for (const sid of sockets) {
            io.sockets.sockets.get(sid)?.leave(roomCode);
          }
        }
        inMemoryRooms.delete(roomCode);
        roomUsers.delete(roomCode);
        roomSockets.delete(roomCode);

        console.log(`Room ${roomCode} deleted by creator ${uid}`);
      } else {
        socket.emit("error", "Cannot delete room without database");
      }
    } catch (err) {
      console.error("DELETE_ROOM_ERROR:", err);
      socket.emit("error", "Failed to delete room");
    }
  });

  socket.on("friend-chat-invite", (data: { friendUserId: string; roomCode: string }) => {
    const sockets = userSockets.get(data.friendUserId);
    if (sockets) {
      for (const sid of sockets) {
        io.to(sid).emit("chat-invite", {
          from: { userId: uid, email: (socket as any).email, username: (socket as any).username },
          roomCode: data.roomCode,
        });
      }
    }
  });

  // Typing indicators
  socket.on("typing", (roomCode: string) => {
    socket.to(roomCode).emit("user-typing", { userId: uid, roomCode });
  });

  socket.on("stop-typing", (roomCode: string) => {
    socket.to(roomCode).emit("user-stop-typing", { userId: uid, roomCode });
  });

  socket.on("send-message", async (data: { roomCode: string; content?: string; type?: string; fileUrl?: string }) => {
    try {
      const { roomCode, content = "", type = "text", fileUrl = "" } = data;
      const senderId = uid;

      const connectedUsers = roomUsers.get(roomCode);
      const others: string[] = [];
      if (connectedUsers) {
        for (const uid of connectedUsers) {
          if (uid !== senderId) others.push(uid);
        }
      }

      // Auto-stop typing when message is sent
      socket.to(roomCode).emit("user-stop-typing", { userId: senderId, roomCode });

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
            broadcastToRoom(roomCode, "new-message", populated);
            return;
          }
        } catch (dbErr) {
          console.error("DB save failed, sending in-memory:", dbErr);
        }
      }

      const msg = {
        _id: new mongoose.Types.ObjectId().toString(),
        content,
        sender: { _id: senderId, email: (socket as any).email, username: (socket as any).username, avatar: "" },
        room: roomCode,
        type,
        fileUrl,
        readBy: others,
        createdAt: new Date().toISOString(),
      };
      broadcastToRoom(roomCode, "new-message", msg);
    } catch (err) {
      console.error("SEND_MESSAGE_ERROR:", err);
      socket.emit("error", "Failed to send message");
    }
  });

  socket.on("delete-message", async (data: { messageId: string; roomCode: string }) => {
    try {
      const { messageId, roomCode } = data;
      if (MONGODB_URI && mongoose.connection.readyState === 1) {
        const msg = await Message.findById(messageId).populate("sender", "_id");
        if (!msg) { socket.emit("error", "Message not found"); return; }

        const room = await Room.findOne({ code: roomCode });
        const isCreator = room?.creator?.toString() === uid;
        const isSender = (msg.sender as any)._id?.toString() === uid;

        if (!isCreator && !isSender) {
          socket.emit("error", "You can only delete your own messages");
          return;
        }

        await Message.findByIdAndDelete(messageId);
        broadcastToRoom(roomCode, "message-deleted", { messageId, roomCode });
      } else {
        socket.emit("error", "Cannot delete message without database");
      }
    } catch (err) {
      console.error("DELETE_MESSAGE_ERROR:", err);
      socket.emit("error", "Failed to delete message");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${(socket as any).email} disconnected`);
    const sockets = userSockets.get(uid);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) userSockets.delete(uid);
    }
    const roomCode = (socket as any).currentRoom;
    if (roomCode) {
      socket.leave(roomCode);
      const sockSet = roomSockets.get(roomCode);
      if (sockSet) {
        sockSet.delete(socket.id);
        if (sockSet.size === 0) roomSockets.delete(roomCode);
      }
      const users = roomUsers.get(roomCode);
      if (users) {
        users.delete(uid);
        if (users.size === 0) roomUsers.delete(roomCode);
      }
      broadcastToRoom(roomCode, "user-left", { userId: uid });
    }

    // Broadcast offline status if last socket
    const isNowOffline = !userSockets.has(uid) || (userSockets.get(uid)?.size ?? 0) === 0;
    if (isNowOffline) {
      for (const [code, users] of roomUsers) {
        if (users.has(uid)) {
          broadcastToRoom(code, "user-offline", { userId: uid });
        }
      }
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

  // Start expiry cleanup interval
  setInterval(cleanupExpiredRooms, 15000);
}

start();
