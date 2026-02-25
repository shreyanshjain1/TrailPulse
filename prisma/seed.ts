import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

const trailImages = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1464823063530-08f10ed1a2dd?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1465311530779-5241f5a29892?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1600&auto=format&fit=crop",
];

function makeRouteLine(lat: number, lng: number, idx: number) {
  const variance = 0.006 + (idx % 4) * 0.0015;

  const points: [number, number][] = [
    [lng - variance * 0.9, lat - variance * 0.8],
    [lng - variance * 0.5, lat - variance * 0.3],
    [lng - variance * 0.2, lat + variance * 0.1],
    [lng + variance * 0.1, lat + variance * 0.35],
    [lng + variance * 0.35, lat + variance * 0.2],
    [lng + variance * 0.55, lat + variance * 0.45],
    [lng + variance * 0.8, lat + variance * 0.7],
  ];

  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: points, // GeoJSON uses [lng, lat]
    },
    properties: {
      name: "Main route",
    },
  };
}

function makeRouteSections(lat: number, lng: number, idx: number) {
  const variance = 0.006 + (idx % 4) * 0.0015;

  return [
    {
      id: "start",
      label: "Trailhead / Start",
      lat: Number((lat - variance * 0.8).toFixed(6)),
      lng: Number((lng - variance * 0.9).toFixed(6)),
      type: "start",
      note: "Warm-up section begins here",
    },
    {
      id: "climb",
      label: "Main Climb",
      lat: Number((lat + variance * 0.35).toFixed(6)),
      lng: Number((lng + variance * 0.1).toFixed(6)),
      type: "climb",
      note: "Steeper ascent, pace yourself",
    },
    {
      id: "ridge",
      label: "Ridge Section",
      lat: Number((lat + variance * 0.2).toFixed(6)),
      lng: Number((lng + variance * 0.55).toFixed(6)),
      type: "ridge",
      note: "Exposed stretch, great views",
    },
    {
      id: "summit",
      label: "Viewpoint / Summit",
      lat: Number((lat + variance * 0.7).toFixed(6)),
      lng: Number((lng + variance * 0.8).toFixed(6)),
      type: "summit",
      note: "Best photo spot",
    },
  ];
}

const trails = Array.from({ length: 36 }).map((_, idx) => {
  const n = idx + 1;
  const region = pick(
    ["Bicol", "Cordillera", "Cebu", "Davao", "Laguna", "Rizal", "Batangas", "Ilocos"],
    idx
  );
  const difficulty = pick([Difficulty.EASY, Difficulty.MODERATE, Difficulty.HARD], idx);

  const distanceKm = Number(
    (6 + (idx % 10) + (difficulty === Difficulty.HARD ? 4 : 0)).toFixed(1)
  );
  const elevationGainM = 300 + (idx % 12) * 85 + (difficulty === Difficulty.HARD ? 500 : 0);

  const lat = 7 + (idx % 10) * 0.35 + (difficulty === Difficulty.HARD ? 0.1 : 0);
  const lng = 121 + (idx % 10) * 0.55 + (difficulty === Difficulty.MODERATE ? 0.2 : 0);

  return {
    name: `Trail ${n}: ${pick(
      [
        "Riverbend Ascent",
        "Lakeside Circuit",
        "Sunrise Peak Trail",
        "Pine Ridge Loop",
        "Cloudline Traverse",
        "Hidden Falls Path",
      ],
      idx
    )}`,
    region,
    difficulty,
    distanceKm,
    elevationGainM,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),

    // REQUIRED FIELD in your Prisma schema
    shortDescription: pick(
      [
        "A scenic route with sweeping views and shaded sections—great for a half-day hike.",
        "A popular local loop with mild gradients and plenty of rest stops.",
        "A steady climb to a viewpoint that pays off at sunrise.",
        "A ridge trail with breezy open stretches and forest pockets.",
        "Rolling terrain with occasional steep bursts and photo-worthy ridgelines.",
        "A relaxing path to a waterfall with safe viewing points.",
      ],
      idx
    ),

    imageUrl: trailImages[idx % trailImages.length],
    routeGeoJson: makeRouteLine(lat, lng, idx),
    routeSections: makeRouteSections(lat, lng, idx),
  };
});

async function main() {
  // clear dependent tables first
  await prisma.review.deleteMany();
  await prisma.weatherSnapshot.deleteMany();
  await prisma.savedTrail.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.calendarEventLink.deleteMany();
  await prisma.hikePlan.deleteMany();

  await prisma.trail.deleteMany();

  // create one by one (safer for JSON fields)
  for (const trail of trails) {
    await prisma.trail.create({
      data: trail,
    });
  }

  console.log(`✅ Seeded ${trails.length} trails with routeGeoJson + routeSections`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });