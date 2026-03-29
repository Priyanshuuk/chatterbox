"use client";

import { useRouter } from "next/navigation";

export function useLogout() {
  const router = useRouter();

  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
}
