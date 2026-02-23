"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/src/components/ui/button";
import { Chrome } from "lucide-react";

export function SignInButton() {
  return (
    <Button className="w-full gap-2" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
      <Chrome className="h-4 w-4" />
      Continue with Google
    </Button>
  );
}
