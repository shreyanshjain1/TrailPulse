import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { profileLocationSchema } from "@/src/server/validators";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = profileLocationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      homeLabel: data.homeLabel,
      homeLat: data.homeLat,
      homeLng: data.homeLng,
    },
  });

  return NextResponse.json({ ok: true });
}