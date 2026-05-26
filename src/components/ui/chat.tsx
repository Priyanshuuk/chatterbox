"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Image, Mic, Send, X, Square, Copy, Check, MessageCircle, UserPlus, UserCheck, Users, ChevronRight } from "lucide-react";

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
  type: "text" | "image" | "audio";
  fileUrl: string;
  readBy?: string[];
  createdAt: string;
}

function AvatarCircle({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  const colorIdx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  if (src) {
    return <img src={src} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${colors[colorIdx]}`}
      style={{ width: size, height: size }}
    >
      {initial}
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
  const [showSidebar, setShowSidebar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomRef = useRef<{ code: string; id: string } | null>(null);
  const joinAttemptedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { roomRef.current = room; }, [room]);

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
    if (joinAttemptedRef.current) return;
    joinAttemptedRef.current = true;
    if (s.connected) {
      s.emit("join-room", code);
    } else {
      s.once("connect", () => s.emit("join-room", code));
    }
    fetchMessages(code);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    joinAttemptedRef.current = false;
    const s = io(SOCKET_URL, { auth: { token } });

    s.on("connect", () => {
      setSocketReady(true);
      joinAttemptedRef.current = false;
      const r = roomRef.current;
      if (r) {
        joinRoomOnSocket(s, r.code);
      }
    });

    s.on("disconnect", () => {
      setSocketReady(false);
      joinAttemptedRef.current = false;
    });

    s.on("room-joined", (data: { code: string; id: string }) => {
      setRoom((prev) => prev || data);
      setShowCreateJoin(false);
      setRoomError("");
    });

    s.on("user-joined", (data: { userId: string; participants: string[] }) => {
      if (data.participants) setParticipants(data.participants);
    });

    s.on("user-left", (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((id) => id !== data.userId));
    });

    s.on("new-message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
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
      joinAttemptedRef.current = false;
    };
  }, [user, joinRoomOnSocket]);

  const fetchMessages = async (code: string) => {
    try {
      const res = await fetch(`/api/messages?roomCode=${code}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const doJoinRoom = (s: Socket, roomData: { code: string; id: string }) => {
    roomRef.current = roomData;
    joinRoomOnSocket(s, roomData.code);
  };

  const createRoom = async () => {
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (data.room) {
        setCreatedCode(data.room.code);
        setRoomCodeInput(data.room.code);
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

  const sendMessage = () => {
    if (!input.trim() || !socket || !room) return;
    socket.emit("send-message", { roomCode: room.code, content: input, type: "text" });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  useEffect(() => { if (user) { fetchFriends(); fetchRequests(); } }, [user, fetchFriends, fetchRequests]);

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

  const startChat = async (friend: Friend) => {
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (data.room) {
        setCreatedCode(data.room.code);
        setRoomCodeInput(data.room.code);
        setRoom(data.room);
        setShowCreateJoin(false);
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
    joinAttemptedRef.current = false;
  };

  const displayName = (msg: Message) =>
    msg.sender?.username || msg.sender?.email?.split("@")[0] || "Unknown";

  const isOwn = (msg: Message) => msg.sender?._id === user?.userId;

  if (showCreateJoin || !room) {
    return (
      <div className="flex-1 relative bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 flex items-start justify-center">
          <div className="w-full max-w-md space-y-6 py-12">
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Chatterbox</h2>
              <p className="text-sm text-zinc-500">Create a room or join one to start chatting</p>
            </div>

            {user?.friendCode && (
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/50 p-4 text-center shadow-sm">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Your friend code</p>
                <p className="text-2xl font-mono font-bold tracking-[0.25em] text-blue-600 dark:text-blue-400">{user.friendCode}</p>
              </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
              <button onClick={createRoom} disabled={!!createdCode} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-medium text-white hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                {createdCode ? "Room Created!" : "Create New Room"}
              </button>

              {createdCode && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-4 text-center space-y-3">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Share this code with a friend:</p>
                  <p className="text-4xl font-mono font-bold tracking-[0.3em] text-blue-600 dark:text-blue-400">{createdCode}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy code"}
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-300 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-3 text-zinc-400">or</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={roomCodeInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setRoomCodeInput(v);
                  setRoomError("");
                }}
                placeholder="Enter 6-digit room code"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-center text-2xl tracking-[0.25em] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              {roomError && <p className="text-sm text-red-500 text-center">{roomError}</p>}
              <button
                onClick={joinRoom}
                disabled={roomCodeInput.length !== 6}
                className="w-full rounded-xl bg-zinc-800 dark:bg-zinc-200 py-3 font-medium text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-300 transition disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute top-6 right-6 z-30 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-700 transition shadow-sm"
          title="Friends"
        >
          <Users size={20} />
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
              {pendingRequests.length}
            </span>
          )}
        </button>

        {showSidebar && (
          <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30" onClick={() => setShowSidebar(false)} />
        )}

        <div
          className={`fixed top-0 right-0 h-full w-[380px] z-50 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transform transition-all duration-300 ease-in-out ${
            showSidebar ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          }`}
        >
          <div className="h-full overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <UserPlus size={18} className="text-blue-500" />
                Friends
              </h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={friendSearchCode}
                onChange={(e) => { setFriendSearchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setFriendSearchError(""); setFriendSearchResult(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") searchFriend(); }}
                placeholder="Enter friend code"
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <button
                onClick={searchFriend}
                disabled={friendSearchCode.length < 4}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition disabled:opacity-50 shadow-sm"
              >
                Search
              </button>
            </div>

            {friendSearchError && <p className="text-xs text-red-500">{friendSearchError}</p>}

            {friendSearchResult && (
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/50 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <AvatarCircle src={friendSearchResult.avatar} name={friendSearchResult.username || friendSearchResult.email} size={36} />
                  <div>
                    <p className="text-sm font-medium">{friendSearchResult.username || friendSearchResult.email.split("@")[0]}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{friendSearchResult.friendCode}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendFriendRequest(friendSearchResult.friendCode)}
                  disabled={friendAdding || friends.some((f) => f.userId === friendSearchResult.userId) || outgoingRequests.some((r) => r.to?.userId === friendSearchResult.userId)}
                  className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition disabled:opacity-50 shadow-sm"
                >
                  {friendAdding ? "Sending..." : friends.some((f) => f.userId === friendSearchResult.userId) ? "Friends" : outgoingRequests.some((r) => r.to?.userId === friendSearchResult.userId) ? "Requested" : "Send Request"}
                </button>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} />
                  Incoming Requests ({pendingRequests.length})
                </h4>
                <div className="space-y-2">
                  {pendingRequests.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-amber-200/50 dark:border-amber-800/30 p-3 shadow-sm">
                      <AvatarCircle src={r.from.avatar} name={r.from.username || r.from.email} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.from.username || r.from.email.split("@")[0]}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{r.from.friendCode}</p>
                      </div>
                      <button onClick={() => acceptRequest(r.id)} className="rounded-lg bg-green-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition shadow-sm"><UserCheck size={14} /></button>
                      <button onClick={() => rejectRequest(r.id)} className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition shadow-sm"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outgoingRequests.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sent Requests ({outgoingRequests.length})</h4>
                <div className="space-y-2">
                  {outgoingRequests.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/30 p-3 opacity-70">
                      <AvatarCircle src={r.to.avatar} name={r.to.username || r.to.email} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.to.username || r.to.email.split("@")[0]}</p>
                        <p className="text-[10px] text-zinc-400">Waiting for response...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle size={14} />
                Friends ({friends.length})
              </h4>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {friends.length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-4">No friends yet. Search by friend code above!</p>
                )}
                {friends.map((f) => (
                  <div key={f.userId} className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/30 p-3 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50 transition-all">
                    <AvatarCircle src={f.avatar} name={f.username || f.email} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.username || f.email.split("@")[0]}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{f.friendCode}</p>
                    </div>
                    <button onClick={() => startChat(f)} className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:from-blue-600 hover:to-indigo-600 transition flex items-center gap-1 shadow-sm">
                      <MessageCircle size={12} /> Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-100 dark:bg-zinc-950 h-full">
      <div className="h-14 px-5 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg tracking-tight">Room:</h1>
          <span className="font-mono font-bold text-lg tracking-widest text-blue-600 dark:text-blue-400">{room.code}</span>
          <button onClick={copyCode} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" title="Copy room code">
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-zinc-400" />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {!socketReady && <span className="text-xs text-amber-500">Connecting...</span>}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${participants.length >= 2 ? "bg-green-500" : "bg-amber-400"}`} />
            <span className="text-xs text-zinc-500">{participants.length === 1 ? "Waiting for someone..." : `${participants.length} online`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AvatarCircle src={user?.avatar} name={user?.username || user?.email?.split("@")[0] || "U"} size={24} />
            <span className="text-sm text-zinc-500 truncate max-w-[100px]">{user?.username || user?.email?.split("@")[0] || "User"}</span>
          </div>
          <button onClick={leaveRoom} className="text-xs text-red-500 hover:text-red-600 transition" title="Leave room">
            <X size={16} />
          </button>
        </div>
      </div>

      {chatInvite && (
        <div className="shrink-0 mx-4 mt-3 flex items-center justify-between rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-2.5">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">{chatInvite.from}</span> invited you to chat
          </p>
          <div className="flex gap-2">
            <button onClick={acceptChatInvite} className="rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition">Join</button>
            <button onClick={() => setChatInvite(null)} className="rounded-lg bg-zinc-300 dark:bg-zinc-700 px-3 py-1 text-xs font-medium hover:bg-zinc-400 dark:hover:bg-zinc-600 transition">Dismiss</button>
          </div>
        </div>
      )}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const sameSender = prev && prev.sender?._id === msg.sender?._id;
          const showAvatar = !isOwn(msg) && !sameSender;
          const isRead = isOwn(msg) && msg.readBy && msg.readBy.length > 0;
          return (
          <div key={msg._id} className={`flex items-end gap-2 ${isOwn(msg) ? "flex-row-reverse" : ""}`}>
            {showAvatar ? (
              <AvatarCircle src={msg.sender?.avatar} name={displayName(msg)} size={30} />
            ) : (
              <div className="w-[30px] shrink-0" />
            )}
            <div className={`max-w-[75%] space-y-0.5 ${isOwn(msg) ? "items-end" : "items-start"}`}>
              {showAvatar && (
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 ml-1 block">
                  {displayName(msg)}
                </span>
              )}
              {msg.type === "text" && (
                <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm break-words ${isOwn(msg) ? "bg-blue-500 text-white rounded-br-sm" : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"}`}>
                  {msg.content}
                </div>
              )}
              {msg.type === "image" && msg.fileUrl && (
                <div>
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                    <img src={msg.fileUrl} alt="Shared image" className={`max-w-[260px] rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:opacity-95 transition ${isOwn(msg) ? "rounded-br-sm" : "rounded-bl-sm"}`} />
                  </a>
                </div>
              )}
              {msg.type === "audio" && msg.fileUrl && (
                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${isOwn(msg) ? "bg-blue-500 rounded-br-sm" : "bg-white dark:bg-zinc-800 rounded-bl-sm"}`}>
                  <audio src={msg.fileUrl} controls className="h-10 w-full max-w-[220px]" />
                </div>
              )}
              <div className={`flex items-center gap-1.5 ${isOwn(msg) ? "justify-end" : ""} px-1`}>
                <span className="text-[10px] text-zinc-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {isOwn(msg) && isRead && (
                  <span className="text-[10px] text-blue-500 font-medium">✓ Seen</span>
                )}
                {isOwn(msg) && !isRead && (
                  <span className="text-[10px] text-zinc-400">✓ Sent</span>
                )}
              </div>
            </div>
          </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        {uploading && <div className="text-xs text-blue-500 text-center">Uploading...</div>}
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50" title="Send image">
            <Image size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />

          {isRecording ? (
            <button onClick={stopRecording} className="p-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition animate-pulse" title="Stop recording">
              <Square size={16} />
            </button>
          ) : (
            <button onClick={startRecording} disabled={uploading} className="p-2.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50" title="Record audio">
              <Mic size={20} />
            </button>
          )}

          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 px-4 py-2.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-full outline-none bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500" />
          <button onClick={sendMessage} disabled={!input.trim() || uploading} className="p-2.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed" title="Send message">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export { ChatApp };
