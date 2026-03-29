"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState("username");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-10">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your account and personal preferences
          </p>
        </div>

        {/* Profile */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold">Profile</h2>

          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border bg-slate-200 dark:bg-slate-700">
              <Image
                src={avatar || "/avatar-placeholder.png"}
                alt="Profile picture"
                fill
                className="object-cover"
              />
            </div>

            <label className="inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-700">
              Change photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </label>
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="w-full rounded-lg border bg-transparent px-3 py-2 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Theme
            </span>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </button>
          </div>
        </section>

        {/* Actions */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm space-y-4">
          <button
            disabled={!dirty}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save changes
          </button>

          <button className="w-full rounded-lg bg-slate-200 dark:bg-slate-700 py-2.5 text-sm font-medium transition hover:opacity-90">
            Log out
          </button>
        </section>

      </div>
    </div>
  );
}
