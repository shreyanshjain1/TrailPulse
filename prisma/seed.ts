import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

// Safe, public image sources (Unsplash with query keywords)
const images = [
  // Mountains / trails / forests only
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80", // mountain valley
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1800&q=80", // mountain lake
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=80", // forest trail
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80", // misty mountains
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80", // mountain ridge
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80", // trail through nature
  "https://images.unsplash.com/photo-1476611338391-6f395a0ebc3b?auto=format&fit=crop&w=1800&q=80", // rocky peak
  "https://images.unsplash.com/photo-1500043357865-c6b8827edf2c?auto=format&fit=crop&w=1800&q=80", // lush mountains
  "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1800&q=80", // hiking path
  "https://images.unsplash.com/photo-1526481280695-3c687fd5432c?auto=format&fit=crop&w=1800&q=80", // pine forest trail
  "https://images.unsplash.com/photo-1501553895911-0055eca6402d?auto=format&fit=crop&w=1800&q=80", // mountain road/trail
  "https://images.unsplash.com/photo-1520962917960-36fef7d1f3e4?auto=format&fit=crop&w=1800&q=80", // sunrise mountains
];

const trails = Array.from({ length: 36 }).map((_, idx) => {
  const n = idx + 1;
  const region = pick(["Bicol", "Cordillera", "Cebu", "Davao", "Laguna", "Rizal", "Batangas", "Ilocos"], idx);
  const difficulty = pick([Difficulty.EASY, Difficulty.MODERATE, Difficulty.HARD], idx);
  const distanceKm = Number((6 + (idx % 10) + (difficulty === Difficulty.HARD ? 4 : 0)).toFixed(1));
  const elevationGainM = 300 + (idx % 12) * 85 + (difficulty === Difficulty.HARD ? 500 : 0);
  const lat = 7 + (idx % 10) * 0.35 + (difficulty === Difficulty.HARD ? 0.1 : 0);
  const lng = 121 + (idx % 10) * 0.55 + (difficulty === Difficulty.MODERATE ? 0.2 : 0);

  return {
    name: `Trail ${n}: ${pick(
      ["Riverbend Ascent", "Lakeside Circuit", "Sunrise Peak Trail", "Pine Ridge Loop", "Cloudline Traverse", "Hidden Falls Path"],
      idx
    )}`,
    region,
    difficulty,
    distanceKm,
    elevationGainM,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    shortDescription:
      pick(
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
    imageUrl: pick(images, idx),
  };
});

async function main() {
  // Trails
  await prisma.trail.deleteMany();
  await prisma.trail.createMany({ data: trails });

  console.log(`Seeded ${trails.length} trails with images.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });