import { type VariantProps } from "class-variance-authority"
import { ArrowRightIcon } from "lucide-react"
import { ReactNode } from "react"

import { cn } from "@/lib/utils"

import Github from "@/components/logos/github"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import Glow from "@/components/ui/glow"
import { Mockup, MockupFrame } from "@/components/ui/mockup"
import Screenshot from "@/components/ui/screenshot"

interface HeroButtonProps {
  href: string
  text: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
  icon?: ReactNode
  iconRight?: ReactNode
}

interface HeroProps {
  title?: string
  description?: string
  mockup?: ReactNode | false
  badge?: ReactNode | false
  buttons?: HeroButtonProps[] | false
  className?: string
}

function Hero({
  title = "Chat. Forget. Repeat.",
  description = "Real-time chat rooms with secure authentication and modern UI",
  mockup = (
    <Screenshot
      srcLight="/dashboard-light.png"
      srcDark="/dashboard-dark.png"
      alt="Chatterbox app screenshot"
      width={1248}
      height={765}
      className="w-full"
    />
  ),
  badge = (
    <Badge variant="outline">
      <span className="text-muted-foreground text-2xl">
        Chat with your friends anywhere everywhere
      </span>
      <a
        href="http://localhost:3000/login"
        className="flex items-center gap-1"
      >
        Get started
        <ArrowRightIcon className="size-3" />
      </a>
    </Badge>
  ),
  buttons = [
    {
      href: "http://localhost:3000/signup",
      text: "Get Started",
      variant: "default",
    },
    {
      href: "https://github.com/Priyanshuuk/chatterbox",
      text: "Github",
      variant: "glow",
      icon: <Github className="mr-2 size-4" />,
    },
  ],
  className,
}: HeroProps) {
  return (
    <section
      className={cn(
        "relative min-h-screen pb-24",
        className
      )}
    >
      <div className="max-w-container mx-auto flex min-h-screen flex-col items-center gap-12 pt-16 sm:gap-24">

        {/* Text content */}
        <div className="flex flex-col items-center gap-6 text-center sm:gap-12">
          {badge !== false && badge}

          <h1 className="relative z-10 text-4xl font-semibold sm:text-6xl md:text-8xl">
            {title}
          </h1>

          <p className="relative z-10 max-w-[740px] text-muted-foreground font-medium sm:text-xl">
            {description}
          </p>

          {buttons !== false && buttons.length > 0 && (
            <div className="relative z-10 flex gap-4">
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  variant={button.variant || "default"}
                  size="lg"
                  asChild
                >
                  <a href={button.href}>
                    {button.icon}
                    {button.text}
                    {button.iconRight}
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Mockup */}
        {mockup !== false && (
          <div className="relative mx-auto w-full max-w-6xl pt-12">
            <MockupFrame size="small">
              <Mockup
                type="responsive"
                className="bg-background/90 w-full rounded-xl border-0"
              >
                {mockup}
              </Mockup>
            </MockupFrame>

            <Glow variant="top" />
          </div>
        )}

      </div>
    </section>
  )
}

export { Hero }
