import { redirect } from "next/navigation";
import { auth } from "@/src/auth";

export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/signin");
}
