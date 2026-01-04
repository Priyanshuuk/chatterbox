import { Calendar, Home, Inbox, Search, Settings ,LogOut ,LogIn} from "lucide-react"
import { useLogout } from "./log-out"
import{ChatApp} from "@/components/ui/chat"
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
    url: "http://localhost:3000/chatterbox/chat",
    icon: Home,
    action : '#' 
  },
  {
    title:"Join-Room",
    url: "#",
    icon: LogIn,
     action : '#' 
  },
  {
    title: "Chat",
    url: "#",
    icon: Inbox,
     action : '#' 
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
     action : '#' 
  },
  {
    title: "Settings",
    url: "http://localhost:3000/chatterbox/setting",
    icon: Settings,
     action : '#' 
  },
  {
    title:"Log-out",
    url: "http://localhost:3000/login",
    icon: LogOut,
    action : useLogout
  }
]

export default function AppSidebar() {
  return (
    <SidebarProvider>
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
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
        <ChatApp>

        </ChatApp>
    </SidebarProvider>
  )
}