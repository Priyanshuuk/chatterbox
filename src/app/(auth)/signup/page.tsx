import { cn } from "@/lib/utils";

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
    src: ".svg",
    alt: "Logo",
    title: "Chatterbox.com",
  },
  buttonText = "Create Account",
  signupText = "Already a user?",
  signupUrl = "http://localhost:3000/login",
  className,
}: Signup1Props){
  return (
    <section className={cn("h-screen bg-muted", className)}>
      <div className="flex h-full items-center justify-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <a href={logo.url}>
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert font-mono text-2xl"
            />
          </a>
          <div className="flex w-full max-w-sm min-w-sm flex-col items-center gap-y-4 rounded-md border border-muted bg-background px-6 py-8 shadow-md">
            {heading && <h1 className="text-2xl font-semibold font-mono">{heading}</h1>}
            <Input
              type="email"
              placeholder="Email"
              className="text-sm"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              className="text-sm"
              required
            />
            <Input
              type="password"
              placeholder="Confirm Password"
              className="text-sm"
              required
            />
            <Button type="submit" className="w-full text-lg font-mono">
              {buttonText}
            </Button>
          </div>
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


