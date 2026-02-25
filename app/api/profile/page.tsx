import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

async function saveLocation(formData: FormData) {
  "use server";

  const user = await requireUser();
  if (!user) return;

  const homeLabel = String(formData.get("homeLabel") ?? "");
  const homeLat = Number(formData.get("homeLat"));
  const homeLng = Number(formData.get("homeLng"));

  if (!homeLabel || Number.isNaN(homeLat) || Number.isNaN(homeLng)) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      homeLabel,
      homeLat,
      homeLng,
    },
  });
}

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      image: true,
      homeLabel: true,
      homeLat: true,
      homeLng: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6 dark:from-emerald-950/30 dark:via-background dark:to-sky-950/20">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Save your start location to automatically sort trails by distance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 rounded-2xl">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dbUser?.image ? (
              <img
                src={dbUser.image}
                alt={dbUser.name ?? "Profile"}
                className="h-16 w-16 rounded-full border object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full border bg-muted" />
            )}
            <div>
              <div className="font-medium">{dbUser?.name ?? "User"}</div>
              <div className="text-muted-foreground">{dbUser?.email}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Joined {dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString() : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader>
            <CardTitle>Start location</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveLocation} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Label</label>
                <input
                  name="homeLabel"
                  defaultValue={dbUser?.homeLabel ?? ""}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder="Office, Home, Quezon City, etc."
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Latitude</label>
                <input
                  name="homeLat"
                  type="number"
                  step="any"
                  defaultValue={dbUser?.homeLat ?? ""}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder="14.6760"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Longitude</label>
                <input
                  name="homeLng"
                  type="number"
                  step="any"
                  defaultValue={dbUser?.homeLng ?? ""}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder="121.0437"
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" className="rounded-xl">
                  Save location
                </Button>
                <span className="text-xs text-muted-foreground">
                  Tip: Use Google Maps → right click a point → copy coordinates.
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}