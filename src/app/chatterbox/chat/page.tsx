import { Home, Inbox, LogIn, Search, Settings, LogOut } from "lucide-react"
import { ChatApp } from "@/components/ui/chat"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Home",
    url: "/chatterbox/chat",
    icon: Home,
  },

  {
    title: "Settings",
    url: "/chatterbox/setting",
    icon: Settings,
  },
  {
    title: "Log-out",
    url: "/login",
    icon: LogOut,
  },
]

export default function AppSidebar() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Chatterbox</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <ChatApp />
    </SidebarProvider>
  )
}
