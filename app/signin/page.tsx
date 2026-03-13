import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import SignInForm from "@/src/components/signin-form";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Welcome to TrailPulse</CardTitle>
          <CardDescription>
            Sign in with Google or email/password. Email/password accounts require verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <p className="mt-4 text-xs text-muted-foreground">
            Google sign-in allows TrailPulse to create calendar events only when you click “Add to Google Calendar”.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}