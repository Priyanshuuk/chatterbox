import { redirect } from "next/navigation";

export default function HomePage() {
  // TEMP: fake auth check
  const isLoggedIn = false;

  if (!isLoggedIn) {
    redirect("/signup");
  }

  redirect("/chat");
}
