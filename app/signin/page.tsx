import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { SignInButton } from "@/src/components/signin-button";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to TrailPulse</CardTitle>
          <CardDescription>Sign in with Google to save trails, plan hikes, and sync to your calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton />
          <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
            By signing in, you allow TrailPulse to create calendar events (only when you click &quot;Add to Google Calendar&quot;).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
