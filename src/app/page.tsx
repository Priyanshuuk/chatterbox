import { redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar/default";
import {Hero} from "@/components/sections/hero/default"
export default function HomePage() {
  // TEMP: fake auth check
  return(
    <div>
      <Navbar></Navbar>
      <Hero></Hero>
    </div>
  )
}
