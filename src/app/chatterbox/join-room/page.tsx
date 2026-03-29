"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function JoinRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleChange = (value: string) => {
    if (/^\d*$/.test(value) && value.length <= 6) {
      setCode(value);
      setError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Room code must be exactly 6 digits");
      return;
    }

    // later: join room logic
    console.log("Joining room:", code);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4 relative">
      
      {/* Close button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 right-6 rounded-full p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-lg"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Join a Room</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit room code to join
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="341526"
            className="w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={code.length !== 6}
          className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}
