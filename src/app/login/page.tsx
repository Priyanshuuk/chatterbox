import { Button } from "@/components/ui/button"
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
  return (
    <div className="min-h-screen flex items-center justify-center bg-black font-mono text-2xl">
      <Card className="w-full max-w-sm bg-black text-white ">
        <CardHeader>
          <CardTitle >Login to your account</CardTitle>
          <CardDescription className="text-sm">
            Enter your email below to login to your account
          </CardDescription>
          <CardAction>
            <Button variant="link" className="bg-gray-700 text-white hover:bg-white hover:text-black hover:text-shadow-sky-300">Sign Up</Button>
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
                <Input id="password" type="password" required />
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full hover:text-shadow-sky-300 hover:bg-white hover:text-black hover:underline underline-offset-8">
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
