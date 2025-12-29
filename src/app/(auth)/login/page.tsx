"use client"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useRouter } from "next/navigation";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CardDemo() {
    const router = useRouter();

    const [email , setemail] = useState("");
    const [password , setpassword] = useState("");


  const handle_login = async () => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  alert("Login successful!");
   router.push("/chat");
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900
 font-mono text-2xl">
      <Card className="w-full max-w-sm dark:bg-black dark:text-white ">
        <CardHeader>
          <CardTitle >Login to your account</CardTitle>
          <CardDescription className="text-sm">
            Enter your email below to login to your account
          </CardDescription>
          <CardAction>
           <a href="http://localhost:3000/signup"> <Button variant="link" className="bg-gray-700 text-white hover:bg-white hover:text-black hover:text-shadow-sky-300" >Sign Up</Button>
         </a>
          </CardAction>
        </CardHeader>

        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value = {email}
                  onChange={(e) => setemail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                   
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required value = {password} onChange={(e) => setpassword(e.target.value)} />
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button onClick={handle_login} type="submit" className="w-full hover:text-shadow-sky-300 hover:bg-white hover:text-black hover:underline underline-offset-8">
            Login
          </Button>
          <Button variant="outline" className="w-full bg-gray-700">
            Login with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
