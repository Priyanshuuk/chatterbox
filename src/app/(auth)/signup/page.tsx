"use client"
import { cn } from "@/lib/utils";
import {useState} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Signup1Props {
  heading?: string;
  logo: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  buttonText?: string;
  googleText?: string;
  signupText?: string;
  signupUrl?: string;
  className?: string;
}

export default function Signup1 ({
  heading ="Signup",
  logo = {
    url: "https://www.Chatterbox.com",
    src: "favicon.ico",
    alt: "Logo",
    title: "Chatterbox.com",
  },
  buttonText = "Create Account",
  signupText = "Already a user?",
  signupUrl = "/login",
  className,
}: Signup1Props){
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const createacc = async () =>{
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    const res = await fetch("/api/auth/signup" , {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        username: username || undefined,
        confirm_password: confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Account created successfully!");
    router.push("/login");
  }

  return (
    <section className={cn("h-screen bg-muted", className)}>
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-6 lg:justify-start ">
          <a href={logo.url}>
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-20 dark:invert font-mono text-2xl lg:h-20 rounded-full dark:invert"
            />
          </a>
          <form onSubmit={(e) => { e.preventDefault(); createacc(); }} className="flex w-full max-w-sm min-w-sm flex-col items-center gap-y-4 rounded-md border border-muted bg-background px-6 py-8 shadow-md">
            {heading && <h1 className="text-2xl font-semibold font-mono">{heading}</h1>}
            <Input
              type="text"
              placeholder="Username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-sm"
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setemail(e.target.value)}
              className="text-sm"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value = {password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-sm"
              required
            />
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              className="text-sm"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full text-lg font-mono">
              {buttonText}
            </Button>
          </form>
          <div className="flex justify-center gap-1 text-sm text-muted-foreground">
            <p>{signupText}</p>
            <a
              href={signupUrl}
              className="font-mono text-primary hover:underline"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
