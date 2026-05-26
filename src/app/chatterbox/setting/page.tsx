"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut } from "lucide-react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUsername(data.user.username || "");
          setEmail(data.user.email || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      let avatarUrl = "";

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await fetch(`${SOCKET_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) avatarUrl = uploadData.url;
      }

      const body: Record<string, string> = {};
      if (username.trim()) body.username = username.trim();
      if (avatarUrl) body.avatar = avatarUrl;

      if (Object.keys(body).length > 0) {
        const res = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "Save failed");
        } else {
          setMessage("Saved successfully");
          setDirty(false);
          setAvatarFile(null);
        }
      }
    } catch {
      setMessage("Save failed");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your account and personal preferences
          </p>
        </div>

        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold">Profile</h2>

          <div className="space-y-1">
            <label className="text-sm text-slate-500 dark:text-slate-400">Email</label>
            <p className="text-sm font-medium">{email}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border bg-slate-200 dark:bg-slate-700">
              <Image
                src={avatar || "/avatar-placeholder.png"}
                alt="Profile picture"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-700">
              Change photo
              <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-500 dark:text-slate-400">Username</label>
            <input
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="w-full rounded-lg border bg-transparent px-3 py-2 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">Theme</span>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm space-y-4">
          {message && (
            <p className={`text-sm text-center ${message === "Saved successfully" ? "text-green-500" : "text-red-500"}`}>
              {message}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-slate-200 dark:bg-slate-700 py-2.5 text-sm font-medium transition hover:opacity-90 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Log out
          </button>
        </section>
      </div>
    </div>
  );
}
