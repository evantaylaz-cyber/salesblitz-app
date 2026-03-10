import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = auth();
  if (userId) {
    redirect("/dashboard");
  }
  // Unauthenticated users go to marketing site
  redirect("https://salesblitz.ai");
}
