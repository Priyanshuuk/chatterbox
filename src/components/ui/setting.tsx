"use client"
import { useState } from "react";
import { Card } from "./card";
type SettingsState = {
  darkMode: boolean;
  readReceipts: boolean;
  notifications: boolean;
};
type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
  description : string;
};
function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`w-11 h-6 rounded-full ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      />
    </div>
  );
}
export default function Setting() {
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    readReceipts: true,
    notifications: true,
  });

  const toggle = (key: keyof SettingsState) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Appearance</h1>

      <Card>
        <Toggle
          label="Dark Mode"
          description="Reduce eye strain in low light"
          checked={settings.darkMode}
          onChange={() => toggle("darkMode")}
        />
      </Card>

      <h1 className="text-2xl font-semibold">Privacy</h1>

      <Card>
        <Toggle
          label="Read Receipts"
          description="Let others see when you read messages"
          checked={settings.readReceipts}
          onChange={() => toggle("readReceipts")}
        />
      </Card>

      <h1 className="text-2xl font-semibold">Notifications</h1>

      <Card>
        <Toggle
          label="Message Notifications"
          description="Get notified about new messages"
          checked={settings.notifications}
          onChange={() => toggle("notifications")}
        />
      </Card>
    </div>
  );
}
export {Setting}