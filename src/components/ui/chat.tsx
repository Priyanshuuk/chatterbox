"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Image, Mic, Send, X, Square, Copy, Check, MessageCircle, UserPlus, UserCheck, Users, MessageSquare, ChevronLeft, Trash2, MapPin, Trash, LogOut, Clock, Eye } from "lucide-react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface User {
  userId: string;
  email: string;
  username?: string;
  avatar?: string;
  friendCode?: string;
}

interface Friend {
  userId: string;
  username: string;
  email: string;
  avatar: string;
  friendCode: string;
}

interface Message {
  _id: string;
  content: string;
  sender: { _id: string; email: string; username?: string; avatar?: string };
  room: string;
  type: "text" | "image" | "audio" | "location";
  fileUrl: string;
  readBy?: string[];
  createdAt: string;
}

interface DMRoom {
  roomCode: string;
  roomId: string;
  otherUser: {
    userId: string;
    username: string;
    email: string;
    avatar: string;
  } | null;
  lastMessage: {
    content: string;
    type: string;
    createdAt: string;
  } | null;
  updatedAt: string;
}

function AvatarCircle({ src, name, size = 36, online }: { src?: string; name: string; size?: number; online?: boolean }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const colors = ["bg-gradient-to-br from-blue-500 to-blue-600", "bg-gradient-to-br from-green-500 to-green-600", "bg-gradient-to-br from-purple-500 to-purple-600", "bg-gradient-to-br from-orange-500 to-orange-600", "bg-gradient-to-br from-pink-500 to-pink-600", "bg-gradient-to-br from-teal-500 to-teal-600"];
  const colorIdx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="rounded-full object-cover ring-2 ring-white dark:ring-zinc-800" style={{ width: size, height: size }} />
      ) : (
        <div className={`rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${colors[colorIdx]}`} style={{ width: size, height: size }}>
          {initial}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px] border-white dark:border-zinc-900 ${online ? "bg-green-500 animate-glow-pulse" : "bg-zinc-400"}`} />
      )}
    </div>
  );
}

function getToken() {
  const fromCookie = document.cookie.match(/(^| )token=([^;]+)/);
  if (fromCookie) return decodeURIComponent(fromCookie[2]);
  return localStorage.getItem("token");
}

function ChatApp() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [room, setRoom] = useState<{ code: string; id: string } | null>(null);
  const [showCreateJoin, setShowCreateJoin] = useState(true);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomError, setRoomError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearchCode, setFriendSearchCode] = useState("");
  const [friendSearchResult, setFriendSearchResult] = useState<Friend | null>(null);
  const [friendSearchError, setFriendSearchError] = useState("");
  const [friendAdding, setFriendAdding] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [chatInvite, setChatInvite] = useState<{ from: string; roomCode: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [dmList, setDmList] = useState<DMRoom[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [roomType, setRoomType] = useState<"group" | "dm">("group");
  const [dmPartner, setDmPartner] = useState<{ userId: string; username: string; email: string; avatar: string } | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [expandedMap, setExpandedMap] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<{ _id: string; email: string; username?: string; avatar?: string } | null>(null);
  const [memberList, setMemberList] = useState<{ _id: string; email: string; username?: string; avatar?: string; friendCode?: string }[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [groupRooms, setGroupRooms] = useState<{ roomCode: string; roomId: string; participantCount: number; lastMessage: { content: string; type: string; createdAt: string } | null; updatedAt: string }[]>([]);
  const [roomCreator, setRoomCreator] = useState<string | null>(null);
  const [maxParticipantsInput, setMaxParticipantsInput] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomRef = useRef<{ code: string; id: string } | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchGroupRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/list");
      const data = await res.json();
      if (data.rooms) setGroupRooms(data.rooms);
    } catch {}
  }, []);

  const fetchRoomMembers = useCallback(async (roomCode: string) => {
    try {
      const res = await fetch(`/api/room/members?roomCode=${roomCode}`);
      const data = await res.json();
      if (data.members) setMemberList(data.members);
    } catch {}
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => {
    roomRef.current = room;
    if (room?.code && roomType === "group") {
      fetchRoomMembers(room.code);
    } else if (!room) {
      setMemberList([]);
    }
  }, [room, roomType, fetchRoomMembers]);

  const currentRoomCode = room?.code;

  const fetchDmList = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/list");
      const data = await res.json();
      if (data.dms) setDmList(data.dms);
    } catch {}
  }, []);

  const fetchOnlineStatus = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/online?userIds=${userIds.join(",")}`);
      const data = await res.json();
      if (data.online) {
        const online = new Set<string>();
        for (const [id, isOnline] of Object.entries(data.online)) {
          if (isOnline) online.add(id);
        }
        setOnlineUsers(online);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUser({ userId: data.user.userId, email: data.user.email, username: data.user.username || data.user.email?.split("@")[0], avatar: data.user.avatar, friendCode: data.user.friendCode });
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const joinRoomOnSocket = useCallback((s: Socket, code: string) => {
    if (s.connected) {
      s.emit("join-room", code);
    }
    fetchMessages(code);
  }, []);

  const fetchMessages = async (code: string) => {
    try {
      const res = await fetch(`/api/messages?roomCode=${code}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.friends) setFriends(data.friends);
    } catch {}
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/requests");
      const data = await res.json();
      if (data.incoming) setPendingRequests(data.incoming);
      if (data.outgoing) setOutgoingRequests(data.outgoing);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    const s = io(SOCKET_URL, { auth: { token } });

    s.on("connect", () => {
      setSocketReady(true);
      const r = roomRef.current;
      if (r) {
        joinRoomOnSocket(s, r.code);
      }
    });

    s.on("disconnect", () => {
      setSocketReady(false);
    });

    s.on("room-messages", (msgs: Message[]) => {
      setMessages(msgs);
    });

    s.on("room-joined", (data: { code: string; id: string; expiresAt?: string; creator?: string }) => {
      setRoom((prev) => prev || data);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
      if (data.creator) setRoomCreator(data.creator);
      setShowCreateJoin(false);
      setRoomError("");
      fetchRoomMembers(data.code);
      fetchGroupRooms();
    });

    s.on("user-joined", (data: { userId: string; participants: string[] }) => {
      if (data.participants) setParticipants(data.participants);
      const code = roomRef.current?.code;
      if (code) fetchRoomMembers(code);
    });

    s.on("user-left", (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((id) => id !== data.userId));
      const code = roomRef.current?.code;
      if (code) fetchRoomMembers(code);
    });

    s.on("new-message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      fetchDmList();
      fetchGroupRooms();
    });

    s.on("message-deleted", (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    });

    s.on("user-typing", (data: { userId: string; roomCode: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (!next.has(data.roomCode)) next.set(data.roomCode, new Set());
        next.get(data.roomCode)!.add(data.userId);
        return next;
      });
    });

    s.on("user-stop-typing", (data: { userId: string; roomCode: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const users = next.get(data.roomCode);
        if (users) {
          users.delete(data.userId);
          if (users.size === 0) next.delete(data.roomCode);
        }
        return next;
      });
    });

    s.on("user-online", (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    });

    s.on("user-offline", (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    s.on("room-expired", (data: { message: string }) => {
      setRoomError(data.message);
      leaveRoom();
    });

    s.on("removed-from-room", (data: { roomCode: string; message: string }) => {
      setRoomError(data.message);
      leaveRoom();
    });

    s.on("room-deleted", (data: { message: string }) => {
      setRoomError(data.message);
      leaveRoom();
    });

    s.on("error", (err: string) => setRoomError(err));

    s.on("friend-request", () => { fetchRequests(); });
    s.on("friend-request-accepted", () => { fetchRequests(); fetchFriends(); });
    s.on("friend-request-rejected", () => { fetchRequests(); });
    s.on("chat-invite", (data: { from: { userId: string; email: string }; roomCode: string }) => {
      setChatInvite({ from: data.from.email, roomCode: data.roomCode });
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setSocketReady(false);
    };
  }, [user, joinRoomOnSocket, fetchDmList, fetchFriends, fetchRequests, fetchRoomMembers, fetchGroupRooms]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchRequests();
      fetchDmList();
      fetchGroupRooms();
    }
  }, [user, fetchFriends, fetchRequests, fetchDmList, fetchGroupRooms]);

  useEffect(() => {
    const allIds = [
      ...friends.map((f) => f.userId),
      ...dmList.map((d) => d.otherUser?.userId).filter(Boolean) as string[],
    ];
    if (user) allIds.push(user.userId);
    if (allIds.length > 0) fetchOnlineStatus([...new Set(allIds)]);
  }, [friends, dmList, fetchOnlineStatus, user]);

  // Anti-screenshot: prevent context menu and detect PrintScreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))) {
        e.preventDefault();
        setRoomError("Screenshots are not allowed");
        setTimeout(() => setRoomError(""), 3000);
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Countdown timer for session rooms
  useEffect(() => {
    if (!expiresAt) { setTimeRemaining(""); return; }
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeRemaining("Expired"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${m}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const doJoinRoom = (s: Socket, roomData: { code: string; id: string }) => {
    roomRef.current = roomData;
    joinRoomOnSocket(s, roomData.code);
  };

  const createRoom = async () => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionDuration: sessionDuration || null, maxParticipants: maxParticipantsInput || null }),
      });
      const data = await res.json();
      if (data.room) {
        setCreatedCode(data.room.code);
        setRoomCodeInput(data.room.code);
        setRoomType("group");
        setDmPartner(null);
        setExpiresAt(data.room.expiresAt || null);
        setRoom(data.room);
        setShowCreateJoin(false);
        if (socket) doJoinRoom(socket, data.room);
        return;
      }
    } catch {}

    if (socket && socket.connected) {
      socket.emit("create-room");
      socket.once("room-created", (r: { code: string; id: string }) => {
        setCreatedCode(r.code);
        setRoomCodeInput(r.code);
        setRoomType("group");
        setDmPartner(null);
        setRoom(r);
        setShowCreateJoin(false);
        doJoinRoom(socket, r);
      });
      socket.once("error", (err: string) => setRoomError(err));
    } else {
      setRoomError("Failed to create room");
    }
  };

  const joinRoom = async () => {
    if (roomCodeInput.length !== 6) {
      setRoomError("Room code must be 6 digits");
      return;
    }
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCodeInput }),
      });
      const data = await res.json();
      if (data.room) {
        setRoomType("group");
        setDmPartner(null);
        setExpiresAt(data.room.expiresAt || null);
        setRoom(data.room);
        setShowCreateJoin(false);
        if (socket) doJoinRoom(socket, data.room);
      } else {
        setRoomError(data.error || "Room not found");
      }
    } catch {
      setRoomError("Failed to join room");
    }
  };

  const openDm = async (friend: Friend) => {
    try {
      const res = await fetch("/api/dm/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId: friend.userId }),
      });
      const data = await res.json();
      if (data.room) {
        setRoomType("dm");
        setDmPartner(data.friend);
        setRoom(data.room);
        setShowCreateJoin(false);
        setShowSidebar(false);
        setCreatedCode("");
        if (socket) doJoinRoom(socket, data.room);
        fetchDmList();
      } else {
        setRoomError(data.error || "Failed to start DM");
      }
    } catch {
      setRoomError("Failed to start DM");
    }
  };

  const openDmByRoom = async (dm: DMRoom) => {
    setRoomType("dm");
    setDmPartner(dm.otherUser);
    setRoom({ code: dm.roomCode, id: dm.roomId });
    setShowCreateJoin(false);
    setShowSidebar(false);
    setCreatedCode("");
    if (socket) doJoinRoom(socket, { code: dm.roomCode, id: dm.roomId });
  };

  const deleteDm = async (dm: DMRoom) => {
    try {
      const res = await fetch(`/api/dm/delete?roomCode=${dm.roomCode}`, { method: "DELETE" });
      if (res.ok) {
        if (room?.code === dm.roomCode) {
          leaveRoom();
        }
        fetchDmList();
      }
    } catch {}
  };

  const sendMessage = () => {
    if (!input.trim() || !socket || !room) return;
    socket.emit("send-message", { roomCode: room.code, content: input, type: "text" });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket.emit("stop-typing", room.code);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!socket || !room) return;
    socket.emit("typing", room.code);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", room.code);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const shareLocation = async () => {
    if (!socket || !room) return;
    setSharingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      const { latitude, longitude } = pos.coords;
      socket.emit("send-message", {
        roomCode: room.code,
        content: `${latitude},${longitude}`,
        type: "location",
      });
    } catch (err: any) {
      if (err.code === 1) setRoomError("Location access denied");
      else setRoomError("Could not get location");
    }
    setSharingLocation(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !room) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${SOCKET_URL}/api/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        socket.emit("send-message", { roomCode: room.code, type: "image", fileUrl: data.url });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length === 0 || !socket || !room) return;
        setUploading(true);
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`${SOCKET_URL}/api/upload`, { method: "POST", body: formData });
          const data = await res.json();
          if (data.url) {
            socket.emit("send-message", { roomCode: room.code, type: "audio", fileUrl: data.url });
          }
        } catch (err) {
          console.error("Audio upload failed:", err);
        }
        setUploading(false);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      setRoomError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        fetchFriends();
      }
    } catch {}
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "reject" }),
      });
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch {}
  };

  const startGroupChat = async (friend: Friend) => {
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (data.room) {
        setCreatedCode(data.room.code);
        setRoomCodeInput(data.room.code);
        setRoomType("group");
        setDmPartner(null);
        setRoom(data.room);
        setShowCreateJoin(false);
        setShowSidebar(false);
        if (socket) doJoinRoom(socket, data.room);
        if (socket && socket.connected) {
          socket.emit("friend-chat-invite", { friendUserId: friend.userId, roomCode: data.room.code });
        }
      } else {
        setRoomError("Failed to create room");
      }
    } catch {
      setRoomError("Failed to create room");
    }
  };

  const acceptChatInvite = () => {
    if (!chatInvite || !socket) return;
    const code = chatInvite.roomCode;
    const roomData = { code, id: code };
    setRoom(roomData);
    setShowCreateJoin(false);
    doJoinRoom(socket, roomData);
    setChatInvite(null);
  };

  const searchFriend = async () => {
    const code = friendSearchCode.trim().toUpperCase();
    if (!code) return;
    setFriendSearchError("");
    setFriendSearchResult(null);
    try {
      const res = await fetch("/api/friends/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.user) {
        setFriendSearchResult(data.user);
      } else {
        setFriendSearchError(data.error || "User not found");
      }
    } catch {
      setFriendSearchError("Search failed");
    }
  };

  const sendFriendRequest = async (code: string) => {
    setFriendAdding(true);
    setFriendSearchError("");
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendSearchResult(null);
        setFriendSearchCode("");
        fetchRequests();
      } else {
        setFriendSearchError(data.error || "Failed to send request");
      }
    } catch {
      setFriendSearchError("Failed to send request");
    }
    setFriendAdding(false);
  };

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const leaveRoom = () => {
    if (socket && room) socket.emit("leave-room");
    setRoom(null);
    setMessages([]);
    setShowCreateJoin(true);
    setCreatedCode("");
    setDmPartner(null);
    setRoomType("group");
    setParticipants([]);
    setExpiresAt(null);
    setTimeRemaining("");
    setRoomCreator(null);
    fetchGroupRooms();
  };

  const displayName = (msg: Message) =>
    msg.sender?.username || msg.sender?.email?.split("@")[0] || "Unknown";

  const isOwn = (msg: Message) => msg.sender?._id === user?.userId;

  const isUserTyping = (roomCode?: string) => {
    if (!roomCode || !typingUsers.has(roomCode)) return "";
    const users = typingUsers.get(roomCode);
    if (!users || users.size === 0) return "";
    const names: string[] = [];
    for (const uid of users) {
      if (uid === user?.userId) continue;
      if (dmPartner && uid === dmPartner.userId) {
        names.push(dmPartner.username || dmPartner.email.split("@")[0]);
      } else {
        const f = friends.find((ff) => ff.userId === uid);
        names.push(f?.username || f?.email.split("@")[0] || "Someone");
      }
    }
    if (names.length === 0) return "";
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const LocationCard = ({ lat, lng }: { lat: string; lng: string }) => {
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}`;
    const isExpanded = expandedMap === `${lat},${lng}`;
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 w-[240px]">
        <div
          className="h-32 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center cursor-pointer relative group"
          onClick={() => setExpandedMap(isExpanded ? null : `${lat},${lng}`)}
        >
          <MapPin size={36} className="text-red-500 drop-shadow-md" />
          <span className="absolute bottom-2 text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition">{isExpanded ? "Collapse" : "Expand"}</span>
        </div>
        {isExpanded && (
          <div className="h-48 bg-zinc-100 dark:bg-zinc-700">
            <iframe
              title="map"
              width="100%"
              height="100%"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.01},${parseFloat(lat) - 0.01},${parseFloat(lng) + 0.01},${parseFloat(lat) + 0.01}&layer=mapnik&marker=${lat},${lng}`}
            />
          </div>
        )}
        <div className="p-2.5 space-y-1.5">
          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">📍 Location</p>
          <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300">{lat}, {lng}</p>
          <div className="flex gap-1.5 pt-1">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-lg bg-blue-500 py-1.5 text-[10px] font-medium text-white hover:bg-blue-600 transition">
              Google Maps
            </a>
            <a href={osmUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-lg bg-zinc-200 dark:bg-zinc-700 py-1.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition">
              OSM
            </a>
          </div>
        </div>
      </div>
    );
  };

  const UserProfileModal = ({ user: u, onClose }: { user: { _id: string; email: string; username?: string; avatar?: string }; onClose: () => void }) => {
    const isFriend = friends.some((f) => f.userId === u._id);
    const isOnline = onlineUsers.has(u._id);
    const friend = friends.find((f) => f.userId === u._id);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in" onClick={(e) => e.stopPropagation()}>
          {/* Cover */}
          <div className="h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
          <div className="px-6 pb-6 -mt-14">
            <div className="flex justify-center">
              <div className="ring-4 ring-white dark:ring-zinc-900 rounded-full shadow-xl">
                <AvatarCircle src={u.avatar} name={u.username || u.email} size={80} online={isOnline} />
              </div>
            </div>
            <div className="text-center mt-3">
              <h2 className="text-xl font-bold">{u.username || u.email.split("@")[0]}</h2>
              <p className="text-sm text-zinc-400 mt-0.5">{u.email}</p>
              {friend?.friendCode && (
                <p className="text-xs font-mono text-zinc-500 mt-1 bg-zinc-100 dark:bg-zinc-800 inline-block px-3 py-1 rounded-full">{friend.friendCode}</p>
              )}
            </div>
            <div className="flex items-center justify-center gap-6 mt-5">
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto ${isOnline ? "bg-green-500 shadow-sm shadow-green-500/50" : "bg-zinc-400"}`} />
                <p className="text-xs font-medium text-zinc-500 mt-1">{isOnline ? "Online" : "Offline"}</p>
              </div>
              <div className="text-center">
                <Users size={16} className="mx-auto text-zinc-400" />
                <p className="text-xs font-medium text-zinc-500 mt-1">{isFriend ? "Friend" : "Not connected"}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              {isFriend && friend && (
                <button onClick={() => { onClose(); openDm(friend); }} className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-blue-600 hover:to-indigo-700 transition shadow-lg shadow-blue-500/20">
                  Message
                </button>
              )}
              <button onClick={onClose} className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SidebarPanel = () => (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <MessageSquare size={16} className="text-white" />
            </div>
            <h2 className="font-bold text-lg">Chatterbox</h2>
          </div>
          <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={18} />
          </button>
        </div>
        {/* User card */}
        {user && (
          <button onClick={() => { setProfileUser({ _id: user.userId, email: user.email, username: user.username, avatar: user.avatar }); setShowProfile(true); }} className="w-full flex items-center gap-3 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/60 dark:to-zinc-800/20 p-2.5 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-md transition-all cursor-pointer">
            <AvatarCircle src={user.avatar} name={user.username || user.email} size={38} online={onlineUsers.has(user.userId)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.username || user.email.split("@")[0]}</p>
              <p className="text-[10px] text-zinc-400 font-mono truncate">{user.friendCode}</p>
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* DM Conversations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle size={14} />
              Conversations
            </h3>
            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{dmList.length}</span>
          </div>
          {dmList.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">No conversations yet.<br />Start a DM with a friend!</p>
          ) : (
            <div className="space-y-1">
              {dmList.map((dm) => (
                <div key={dm.roomCode} className="group relative">
                  <button
                    onClick={() => openDmByRoom(dm)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:shadow-sm ${
                      room?.code === dm.roomCode
                        ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 shadow-sm"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                    }`}
                  >
                    <AvatarCircle
                      src={dm.otherUser?.avatar}
                      name={dm.otherUser?.username || dm.otherUser?.email || "?"}
                      size={40}
                      online={dm.otherUser ? onlineUsers.has(dm.otherUser.userId) : undefined}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{dm.otherUser?.username || dm.otherUser?.email.split("@")[0] || "Unknown"}</p>
                        {dm.otherUser && onlineUsers.has(dm.otherUser.userId) && (
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 shadow-sm shadow-green-500/40" />
                        )}
                      </div>
                      {dm.lastMessage && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {dm.lastMessage.type === "image" ? "📷 Image" : dm.lastMessage.type === "audio" ? "🎤 Audio" : dm.lastMessage.type === "location" ? "📍 Location" : dm.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDm(dm); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-500 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Rooms */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} />
              Group Rooms
            </h3>
            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{groupRooms.length}</span>
          </div>
          {groupRooms.length > 0 && (
            <div className="space-y-1 mb-3">
              {groupRooms.map((gr) => {
                const isActive = room?.code === gr.roomCode && roomType === "group";
                return (
                  <div key={gr.roomCode} className="group relative">
                    <button
                      onClick={() => {
                        setCreatedCode(gr.roomCode);
                        setRoomCodeInput(gr.roomCode);
                        setRoomType("group");
                        setDmPartner(null);
                        setRoom({ code: gr.roomCode, id: gr.roomId });
                        setShowCreateJoin(false);
                        setShowSidebar(false);
                        if (socket) doJoinRoom(socket, { code: gr.roomCode, id: gr.roomId });
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:shadow-sm ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 shadow-sm"
                          : "bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Users size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">#{gr.roomCode}</p>
                          <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">{gr.participantCount}</span>
                        </div>
                        {gr.lastMessage && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {gr.lastMessage.type === "image" ? "📷 Image" : gr.lastMessage.type === "audio" ? "🎤 Audio" : gr.lastMessage.type === "location" ? "📍 Location" : gr.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Create / Join Room */}
          <div className="rounded-2xl bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
            <button
              onClick={createRoom}
              disabled={!!createdCode && roomType === "group"}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-blue active:scale-[0.98]"
            >
              {createdCode && roomType === "group" ? "✓ Room Created!" : "Create New Room"}
            </button>
          {/* Session duration picker */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-zinc-400 shrink-0" />
            <select
              value={sessionDuration}
              onChange={(e) => setSessionDuration(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer"
            >
              <option value="">No expiry</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="360">6 hours</option>
              <option value="1440">24 hours</option>
            </select>
            {sessionDuration && (
              <span className="text-[10px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full shrink-0">
                Session
              </span>
            )}
          </div>
          {/* Max participants picker */}
          <div className="flex items-center gap-2">
            <Users size={14} className="text-zinc-400 shrink-0" />
            <select
              value={maxParticipantsInput}
              onChange={(e) => setMaxParticipantsInput(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer"
            >
              <option value="">Unlimited</option>
              <option value="5">5 max</option>
              <option value="10">10 max</option>
              <option value="20">20 max</option>
              <option value="50">50 max</option>
              <option value="100">100 max</option>
            </select>
            {maxParticipantsInput && (
              <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-full shrink-0">
                Limit
              </span>
            )}
          </div>
          {createdCode && roomType === "group" && room?.code === createdCode && (
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/50 p-3 text-center space-y-2">
              <p className="text-[10px] text-zinc-500">Share this code:</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-blue-600 dark:text-blue-400">{createdCode}</p>
              <button onClick={() => { navigator.clipboard.writeText(createdCode!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 transition">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={roomCodeInput}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setRoomCodeInput(v); setRoomError(""); }}
                placeholder="6-digit code"
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-center tracking-[0.2em] font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <br></br>
              <button
                onClick={joinRoom}
                disabled={roomCodeInput.length !== 6}
                className="rounded-xl bg-zinc-800 dark:bg-zinc-200 px-5 py-2.5 text-sm font-medium text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-300 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                Join
              </button>
            </div>
            {roomError && <p className="text-xs text-red-500 text-center mt-2">{roomError}</p>}
          </div>
        </div>
      </div>

        {/* Add Friend */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus size={14} />
            Add Friend
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={friendSearchCode}
              onChange={(e) => { setFriendSearchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setFriendSearchError(""); setFriendSearchResult(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") searchFriend(); }}
              placeholder="Friend code"
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <button onClick={searchFriend} disabled={friendSearchCode.length < 4} className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition disabled:opacity-50 shadow-sm">
              Search
            </button>
          </div>
          {friendSearchError && <p className="text-xs text-red-500">{friendSearchError}</p>}
          {friendSearchResult && (
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/50 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <AvatarCircle src={friendSearchResult.avatar} name={friendSearchResult.username || friendSearchResult.email} size={38} />
                <div>
                  <p className="text-sm font-semibold">{friendSearchResult.username || friendSearchResult.email.split("@")[0]}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">{friendSearchResult.friendCode}</p>
                </div>
              </div>
              <button
                onClick={() => sendFriendRequest(friendSearchResult.friendCode)}
                disabled={friendAdding || friends.some((f) => f.userId === friendSearchResult.userId) || outgoingRequests.some((r) => r.to?.userId === friendSearchResult.userId)}
                className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition disabled:opacity-50 shadow-sm"
              >
                {friendAdding ? "..." : friends.some((f) => f.userId === friendSearchResult.userId) ? "Friends ✓" : outgoingRequests.some((r) => r.to?.userId === friendSearchResult.userId) ? "Sent" : "Add"}
              </button>
            </div>
          )}
        </div>

        {/* Incoming Requests */}
        {pendingRequests.length > 0 && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={14} />
                Requests
              </h4>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            </div>
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-amber-200/50 dark:border-amber-800/30 p-3 shadow-sm">
                <AvatarCircle src={r.from.avatar} name={r.from.username || r.from.email} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.from.username || r.from.email.split("@")[0]}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">{r.from.friendCode}</p>
                </div>
                <button onClick={() => acceptRequest(r.id)} className="rounded-xl bg-green-500 p-2 text-white hover:bg-green-600 transition shadow-sm"><UserCheck size={16} /></button>
                <button onClick={() => rejectRequest(r.id)} className="rounded-xl bg-red-500 p-2 text-white hover:bg-red-600 transition shadow-sm"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} />
              Friends
            </h3>
            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{friends.length}</span>
          </div>
          {friends.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl">No friends yet.<br />Search by friend code above!</p>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {friends.map((f) => (
                <div key={f.userId} className="flex items-center gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-3 hover:shadow-sm transition-all">
                  <AvatarCircle src={f.avatar} name={f.username || f.email} size={38} online={onlineUsers.has(f.userId)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{f.username || f.email.split("@")[0]}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">{onlineUsers.has(f.userId) ? "Online" : "Offline"}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openDm(f)} className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-2 text-white hover:from-blue-600 hover:to-indigo-600 transition shadow-sm" title="Start DM">
                      <MessageCircle size={14} />
                    </button>
                    <button onClick={() => startGroupChat(f)} className="rounded-xl bg-zinc-500 p-2 text-white hover:bg-zinc-600 transition shadow-sm" title="Group chat invite">
                      <Users size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <div className={`w-2 h-2 rounded-full ${socketReady ? "bg-green-500" : "bg-amber-400"}`} />
          {socketReady ? "Connected" : "Connecting..."}
        </div>
      </div>
    </div>
  );

  // ===== LANDING / NO ROOM VIEW =====
  if (showCreateJoin || !room) {
    return (
      <div className="flex-1 flex h-full bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        {showSidebar && (
          <div className="w-full md:w-96 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <SidebarPanel />
          </div>
        )}
        {!showSidebar && (
          <div className="flex items-center justify-center w-full">
            <div className="text-center space-y-4 animate-float">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <MessageSquare size={36} className="text-white" />
              </div>
              <p className="text-sm text-zinc-400 font-medium">Select a conversation to start chatting</p>
              <button onClick={() => setShowSidebar(true)} className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.97]">
                Open Sidebar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== CHAT VIEW =====
  return (
    <div className="flex-1 flex h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className={`${showSidebar ? "w-96" : "w-0"} border-r border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl transition-all duration-300 overflow-hidden hidden md:block shadow-md`}>
        <SidebarPanel />
      </div>
      <div className={`fixed inset-0 z-40 md:hidden ${showSidebar ? "block" : "hidden"}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
        <div className="absolute left-0 top-0 bottom-0 w-96 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-y-auto">
          <SidebarPanel />
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <div className="shrink-0 h-18 px-6 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition hover:text-zinc-600 dark:hover:text-zinc-300 active:scale-90">
              <MessageSquare size={20} />
            </button>
            {roomType === "dm" && dmPartner ? (
              <>
                <AvatarCircle src={dmPartner.avatar} name={dmPartner.username || dmPartner.email} size={40} online={onlineUsers.has(dmPartner.userId)} />
                <div className="min-w-0">
                  <h1 className="font-semibold text-base truncate">{dmPartner.username || dmPartner.email.split("@")[0]}</h1>
                  <p className="text-[11px] font-medium text-zinc-400">{onlineUsers.has(dmPartner.userId) ? "Online" : "Offline"}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-base">Group Room</h1>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400">{room.code}</span>
                    <button onClick={copyCode} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90" title="Copy code">
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-zinc-400" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!socketReady && (
              <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full">Reconnecting...</span>
            )}
            {roomType === "group" && (
              <>
                <div className="relative">
                  <button onClick={() => { fetchRoomMembers(room.code); setShowMembers(!showMembers); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95" title="Members">
                    <Users size={14} className="text-zinc-500" />
                    <span className="text-[11px] font-medium text-zinc-500">{memberList.length || participants.length}</span>
                  </button>
                  {showMembers && memberList.length > 0 && (
                    <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl glass-card shadow-2xl z-50 p-2 space-y-1 animate-in" onClick={(e) => e.stopPropagation()}>
                      {memberList.map((m) => {
                        const isSelf = m._id === user?.userId;
                        const isOnline = onlineUsers.has(m._id);
                        return (
                          <div key={m._id} className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-green-500" : "bg-zinc-400"}`} />
                            <span className="text-sm font-medium truncate flex-1">
                              {m.username || m.email.split("@")[0]}
                              {isSelf && <span className="text-[10px] text-zinc-400 ml-1">(you)</span>}
                            </span>
                            {roomCreator === user?.userId && !isSelf && (
                              <button
                                onClick={() => { if (socket && room) socket.emit("remove-user", { targetUserId: m._id, roomCode: room.code }); }}
                                className="p-1 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition"
                                title="Kick"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span className={`w-2 h-2 rounded-full ${participants.length >= 2 ? "bg-green-500" : "bg-amber-400"}`} />
                  <span className="text-[11px] font-medium text-zinc-500">{participants.length <= 1 ? "Waiting..." : `${participants.length} online`}</span>
                </div>
              </>
            )}
            {roomType === "dm" && dmPartner && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <span className={`w-2 h-2 rounded-full ${onlineUsers.has(dmPartner.userId) ? "bg-green-500" : "bg-zinc-400"}`} />
                <span className="text-[11px] font-medium text-zinc-500">{onlineUsers.has(dmPartner.userId) ? "Online" : "Offline"}</span>
              </div>
            )}
            {timeRemaining && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <Clock size={12} className="text-amber-500" />
                <span className={`text-[11px] font-mono font-bold ${timeRemaining === "Expired" ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
                  {timeRemaining}
                </span>
              </div>
            )}
            {roomType === "group" && roomCreator === user?.userId && (
              <button onClick={() => { if (socket && room) { socket.emit("delete-room", room.code); } }} className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition active:scale-90" title="Delete room">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={leaveRoom} className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition active:scale-90" title="Leave">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Chat invite banner */}
        {chatInvite && (
          <div className="shrink-0 mx-4 mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 shadow-sm">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">{chatInvite.from}</span> invited you to chat
            </p>
            <div className="flex gap-2">
              <button onClick={acceptChatInvite} className="rounded-lg bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition shadow-sm active:scale-95">Join</button>
              <button onClick={() => setChatInvite(null)} className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition active:scale-95">Dismiss</button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 px-8 py-6 overflow-y-auto space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100/50 via-transparent to-transparent dark:from-zinc-900/30 select-none watermark-bg">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 animate-float">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center mb-6 shadow-inner shadow-lg shadow-zinc-900/5">
                <MessageCircle size={40} className="text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-lg font-semibold text-zinc-500 dark:text-zinc-400">No messages yet</p>
              <p className="text-sm text-zinc-400 mt-1.5">Send a message to start the conversation</p>
              {roomType === "group" && (
                <div className="mt-6 px-5 py-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/50 dark:border-blue-800/30 flex items-center gap-3 text-sm">
                  <Copy size={14} className="text-blue-500 shrink-0" />
                  <span className="text-blue-600 dark:text-blue-400">Share code <strong className="font-mono">{room.code}</strong> to invite others</span>
                </div>
              )}
            </div>
          )}
          {messages.map((msg, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const sameSender = prev && prev.sender?._id === msg.sender?._id;
            const showAvatar = !isOwn(msg) && !sameSender;
            const isRead = isOwn(msg) && msg.readBy && msg.readBy.length > 0;
            return (
            <div key={msg._id} className={`flex items-end gap-3 animate-message-in group ${isOwn(msg) ? "flex-row-reverse" : ""}`}>
              {showAvatar ? (
                <button onClick={() => { setProfileUser(msg.sender); setShowProfile(true); }}>
                  <AvatarCircle src={msg.sender?.avatar} name={displayName(msg)} size={34} online={onlineUsers.has(msg.sender?._id)} />
                </button>
              ) : (
                <div className="w-[34px] shrink-0" />
              )}
              <div className={`max-w-[75%] space-y-1 ${isOwn(msg) ? "items-end" : "items-start"}`}>
                {showAvatar && (
                  <button onClick={() => { setProfileUser(msg.sender); setShowProfile(true); }} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-1.5 block hover:text-blue-500 transition">
                    {displayName(msg)}
                  </button>
                )}
                {msg.type === "text" && (
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words message-bubble ${
                    isOwn(msg)
                      ? "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-br-sm shadow-glow-blue"
                      : "bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-bl-sm shadow-glow-green"
                  }`}>
                    {msg.content}
                  </div>
                )}
                {msg.type === "image" && msg.fileUrl && (
                  <div className={`overflow-hidden message-bubble ${isOwn(msg) ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"} shadow-lg border border-zinc-200/50 dark:border-zinc-700/50`}>
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img src={msg.fileUrl} alt="Shared image" className="max-w-[300px] max-h-[400px] object-cover cursor-pointer hover:scale-[1.02] hover:opacity-95 transition-all duration-300 block" />
                    </a>
                  </div>
                )}
                {msg.type === "audio" && msg.fileUrl && (
                  <div className={`px-4 py-3 rounded-2xl shadow-lg message-bubble ${
                    isOwn(msg)
                      ? "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-br-sm"
                      : "glass rounded-bl-sm"
                  }`}>
                    <audio src={msg.fileUrl} controls className="h-10 w-full max-w-[240px]" />
                  </div>
                )}
                {msg.type === "location" && msg.content && (() => {
                  const parts = msg.content.split(",");
                  if (parts.length === 2) {
                    return <LocationCard lat={parts[0].trim()} lng={parts[1].trim()} />;
                  }
                  return <div className="px-4 py-2.5 rounded-2xl text-sm shadow-sm bg-zinc-200 dark:bg-zinc-700">{msg.content}</div>;
                })()}
                <div className={`flex items-center gap-2 ${isOwn(msg) ? "justify-end" : ""} px-1.5`}>
                  {!isOwn(msg) && roomType === "group" && roomCreator === user?.userId && (
                    <button onClick={() => { if (socket && room) socket.emit("delete-message", { messageId: msg._id, roomCode: room.code }); }} className="p-0.5 rounded text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition" title="Delete message">
                      <Trash2 size={12} />
                    </button>
                  )}
                  <span className="text-[10px] text-zinc-400 font-medium">{formatTime(msg.createdAt)}</span>
                  {isOwn(msg) && (
                    <button onClick={() => { if (socket && room) socket.emit("delete-message", { messageId: msg._id, roomCode: room.code }); }} className="p-0.5 rounded text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition" title="Delete message">
                      <Trash2 size={12} />
                    </button>
                  )}
                  {isOwn(msg) && isRead && (
                    <span className="text-[10px] text-blue-500 font-semibold flex items-center gap-0.5">
                      <Check size={10} /> Seen
                    </span>
                  )}
                  {isOwn(msg) && !isRead && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                      <Check size={10} /> Sent
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })}
          {/* Typing indicator */}
          {currentRoomCode && isUserTyping(currentRoomCode) && (
            <div className="flex items-center gap-3 text-sm text-zinc-500 italic px-1 animate-slide-up">
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <span className="font-medium text-xs">{isUserTyping(currentRoomCode)}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-6 py-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 shadow-lg">
          {uploading && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-xs font-medium text-blue-500">Uploading...</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-500 transition active:scale-90 disabled:opacity-50" title="Send image">
              <Image size={22} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />

            {isRecording ? (
              <button onClick={stopRecording} className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition animate-pulse shadow-sm active:scale-90" title="Stop recording">
                <Square size={18} />
              </button>
            ) : (
              <button onClick={startRecording} disabled={uploading} className="p-2.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500 transition active:scale-90 disabled:opacity-50" title="Record audio">
                <Mic size={22} />
              </button>
            )}

            <button onClick={shareLocation} disabled={sharingLocation || uploading} className="p-2.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-green-500 transition active:scale-90 disabled:opacity-50" title="Share location">
              {sharingLocation ? (
                <div className="w-5 h-5 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              ) : (
                <MapPin size={22} />
              )}
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full px-5 py-3.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none bg-zinc-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all duration-200 placeholder:text-zinc-400 shadow-sm"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || uploading}
              className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-blue active:scale-90"
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && profileUser && (
        <UserProfileModal user={profileUser} onClose={() => { setShowProfile(false); setProfileUser(null); }} />
      )}
    </div>
  );
}

export { ChatApp };
