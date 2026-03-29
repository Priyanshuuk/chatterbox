"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const handleCreateRoom = async () => {
    setLoading(true);
    setError("");
    setRoomCode("");

    try {
      const res = await fetch("/api/create_room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name: roomName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setRoomCode(data.room.code);
      setRoomName("");

    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted via-background to-muted px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-background/80 p-8 shadow-xl backdrop-blur">

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create a Room
          </h1>
          <p className="text-sm text-muted-foreground">
            Start a new conversation space
          </p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />

          <Button
            onClick={handleCreateRoom}
            disabled={loading || !roomName || !email}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Room"}
          </Button>
        </div>

        {roomCode && (
          <div className="rounded-lg bg-green-500/10 p-4 text-center text-sm text-green-600">
            Room created successfully
            <div className="mt-2 text-lg font-semibold tracking-wide">
              Code: {roomCode}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
