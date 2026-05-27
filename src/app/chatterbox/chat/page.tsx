"use client";

import { Home, Settings, LogOut, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { ChatApp } from "@/components/ui/chat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { title: "Home", url: "/chatterbox/chat", icon: Home },
  { title: "Settings", url: "/chatterbox/setting", icon: Settings },
];

function SidebarUserCard() {
  const { state } = useSidebar();
  const [userData, setUserData] = useState<{ username?: string; email: string; friendCode?: string } | null>(null);
  const collapsed = state === "collapsed";

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUserData({
            username: data.user.username || data.user.email?.split("@")[0],
            email: data.user.email,
            friendCode: data.user.friendCode,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!userData) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 mx-2 mb-2 rounded-xl bg-gradient-to-br from-zinc-50/50 to-zinc-100/50 dark:from-zinc-800/30 dark:to-zinc-800/10 border border-zinc-200/30 dark:border-zinc-700/30">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
        {(userData.username || userData.email)[0].toUpperCase()}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{userData.username || userData.email.split("@")[0]}</p>
          <p className="text-[9px] text-zinc-400 font-mono truncate">{userData.friendCode || userData.email}</p>
        </div>
      )}
    </div>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-svh w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="border-b border-zinc-200/50 dark:border-zinc-800/50 pb-0">
            <div className="flex items-center gap-3 px-3 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <MessageSquare size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-zinc-800 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">Chatterbox</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <a
                            href={item.url}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-800/30"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                            }`}
                          >
                            <item.icon size={18} />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-2 pt-2">
            <SidebarUserCard />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Log out">
                  <a
                    href="/login"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                  >
                    <LogOut size={18} />
                    <span>Log out</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-medium">Ctrl+B</span>
              <SidebarTrigger className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" />
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatApp />
        </main>
      </div>
    </SidebarProvider>
  );
}
