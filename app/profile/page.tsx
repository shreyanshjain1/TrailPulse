import { redirect } from "next/navigation";
import { auth } from "@/src/auth";
import { prisma } from "@/src/server/prisma";
import { ProfileForm } from "@/src/components/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      homeLabel: true,
      homeLat: true,
      homeLng: true,
    },
  });

  if (!user) redirect("/signin");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-sky-950/10">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Set your start location to sort trails by distance and improve recommendations.
        </p>
      </section>

      <ProfileForm
        initial={{
          name: user.name ?? "",
          email: user.email ?? "",
          image: user.image ?? "",
          homeLabel: user.homeLabel ?? "",
          homeLat: user.homeLat ?? null,
          homeLng: user.homeLng ?? null,
        }}
      />
    </div>
  );
}