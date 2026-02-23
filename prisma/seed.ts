import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const trails = [
  {
    "name": "Trail 1: Riverbend Ascent",
    "region": "Cordillera",
    "difficulty": "MODERATE",
    "distanceKm": 7.3,
    "elevationGainM": 266,
    "lat": 6.414433,
    "lng": 124.443809,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 2: Riverbend Ascent",
    "region": "Ilocos",
    "difficulty": "EASY",
    "distanceKm": 4.3,
    "elevationGainM": 410,
    "lat": 13.307858,
    "lng": 122.882832,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 3: Sunrise Peak Trail",
    "region": "Bicol",
    "difficulty": "MODERATE",
    "distanceKm": 7.9,
    "elevationGainM": 1397,
    "lat": 15.471542,
    "lng": 119.389036,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 4: Ridge-to-Reef Route",
    "region": "Visayas",
    "difficulty": "EASY",
    "distanceKm": 21.2,
    "elevationGainM": 571,
    "lat": 6.279893,
    "lng": 118.841432,
    "shortDescription": "Forest trail with occasional streams; expect muddy patches after rain."
  },
  {
    "name": "Trail 5: Volcanic Viewpoint",
    "region": "Visayas",
    "difficulty": "HARD",
    "distanceKm": 16.7,
    "elevationGainM": 881,
    "lat": 18.428998,
    "lng": 121.293249,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 6: Hidden Falls Path",
    "region": "Mindanao",
    "difficulty": "MODERATE",
    "distanceKm": 16.2,
    "elevationGainM": 121,
    "lat": 8.144996,
    "lng": 120.517675,
    "shortDescription": "A scenic route with sweeping views and shaded sections\u2014great for a half\u2011day hike."
  },
  {
    "name": "Trail 7: Summit Spur",
    "region": "Sierra Madre",
    "difficulty": "MODERATE",
    "distanceKm": 11.3,
    "elevationGainM": 1342,
    "lat": 7.244627,
    "lng": 121.090855,
    "shortDescription": "Forest trail with occasional streams; expect muddy patches after rain."
  },
  {
    "name": "Trail 8: Riverbend Ascent",
    "region": "Calabarzon",
    "difficulty": "MODERATE",
    "distanceKm": 7.3,
    "elevationGainM": 766,
    "lat": 8.72528,
    "lng": 126.050903,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 9: Summit Spur",
    "region": "Mindanao",
    "difficulty": "HARD",
    "distanceKm": 17.6,
    "elevationGainM": 405,
    "lat": 5.442983,
    "lng": 120.744442,
    "shortDescription": "Forest trail with occasional streams; expect muddy patches after rain."
  },
  {
    "name": "Trail 10: Riverbend Ascent",
    "region": "Bicol",
    "difficulty": "HARD",
    "distanceKm": 13.6,
    "elevationGainM": 1162,
    "lat": 7.934246,
    "lng": 122.343312,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 11: Cloudline Traverse",
    "region": "Visayas",
    "difficulty": "EASY",
    "distanceKm": 17.0,
    "elevationGainM": 885,
    "lat": 15.308791,
    "lng": 121.727374,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 12: Sunrise Peak Trail",
    "region": "Mindanao",
    "difficulty": "EASY",
    "distanceKm": 22.0,
    "elevationGainM": 839,
    "lat": 6.25455,
    "lng": 118.409912,
    "shortDescription": "A scenic route with sweeping views and shaded sections\u2014great for a half\u2011day hike."
  },
  {
    "name": "Trail 13: Cloudline Traverse",
    "region": "Calabarzon",
    "difficulty": "HARD",
    "distanceKm": 10.7,
    "elevationGainM": 148,
    "lat": 10.266346,
    "lng": 126.666256,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 14: Hidden Falls Path",
    "region": "Cordillera",
    "difficulty": "MODERATE",
    "distanceKm": 4.7,
    "elevationGainM": 1421,
    "lat": 15.362114,
    "lng": 124.686809,
    "shortDescription": "Forest trail with occasional streams; expect muddy patches after rain."
  },
  {
    "name": "Trail 15: Riverbend Ascent",
    "region": "Visayas",
    "difficulty": "MODERATE",
    "distanceKm": 11.3,
    "elevationGainM": 1528,
    "lat": 17.086771,
    "lng": 120.291485,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 16: Cloudline Traverse",
    "region": "Sierra Madre",
    "difficulty": "HARD",
    "distanceKm": 8.3,
    "elevationGainM": 1040,
    "lat": 13.403789,
    "lng": 119.329702,
    "shortDescription": "Mixed terrain with steady climbs, rewarding ridge panoramas, and photo spots."
  },
  {
    "name": "Trail 17: Lakeside Circuit",
    "region": "Cordillera",
    "difficulty": "MODERATE",
    "distanceKm": 12.0,
    "elevationGainM": 223,
    "lat": 10.009135,
    "lng": 126.572296,
    "shortDescription": "Forest trail with occasional streams; expect muddy patches after rain."
  },
  {
    "name": "Trail 18: Summit Spur",
    "region": "Cordillera",
    "difficulty": "EASY",
    "distanceKm": 13.6,
    "elevationGainM": 172,
    "lat": 15.100325,
    "lng": 125.099402,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 19: Cloudline Traverse",
    "region": "Calabarzon",
    "difficulty": "MODERATE",
    "distanceKm": 21.0,
    "elevationGainM": 305,
    "lat": 12.281898,
    "lng": 123.277367,
    "shortDescription": "Mixed terrain with steady climbs, rewarding ridge panoramas, and photo spots."
  },
  {
    "name": "Trail 20: Lakeside Circuit",
    "region": "Bicol",
    "difficulty": "MODERATE",
    "distanceKm": 10.3,
    "elevationGainM": 1091,
    "lat": 10.153203,
    "lng": 125.826643,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 21: Riverbend Ascent",
    "region": "Bicol",
    "difficulty": "EASY",
    "distanceKm": 9.1,
    "elevationGainM": 961,
    "lat": 8.175583,
    "lng": 119.915891,
    "shortDescription": "A scenic route with sweeping views and shaded sections\u2014great for a half\u2011day hike."
  },
  {
    "name": "Trail 22: Pine Ridge Loop",
    "region": "Bicol",
    "difficulty": "EASY",
    "distanceKm": 3.1,
    "elevationGainM": 562,
    "lat": 12.095354,
    "lng": 120.422752,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 23: Summit Spur",
    "region": "Calabarzon",
    "difficulty": "MODERATE",
    "distanceKm": 19.7,
    "elevationGainM": 943,
    "lat": 8.353362,
    "lng": 122.114865,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 24: Summit Spur",
    "region": "Sierra Madre",
    "difficulty": "EASY",
    "distanceKm": 10.9,
    "elevationGainM": 706,
    "lat": 11.44494,
    "lng": 124.34296,
    "shortDescription": "A scenic route with sweeping views and shaded sections\u2014great for a half\u2011day hike."
  },
  {
    "name": "Trail 25: Pine Ridge Loop",
    "region": "Ilocos",
    "difficulty": "MODERATE",
    "distanceKm": 18.1,
    "elevationGainM": 219,
    "lat": 7.643943,
    "lng": 122.665686,
    "shortDescription": "Mixed terrain with steady climbs, rewarding ridge panoramas, and photo spots."
  },
  {
    "name": "Trail 26: Sunrise Peak Trail",
    "region": "Calabarzon",
    "difficulty": "EASY",
    "distanceKm": 7.4,
    "elevationGainM": 1481,
    "lat": 11.115204,
    "lng": 125.493737,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 27: Riverbend Ascent",
    "region": "Cordillera",
    "difficulty": "MODERATE",
    "distanceKm": 13.0,
    "elevationGainM": 72,
    "lat": 6.287026,
    "lng": 124.55602,
    "shortDescription": "Mixed terrain with steady climbs, rewarding ridge panoramas, and photo spots."
  },
  {
    "name": "Trail 28: Cloudline Traverse",
    "region": "Ilocos",
    "difficulty": "MODERATE",
    "distanceKm": 6.7,
    "elevationGainM": 671,
    "lat": 5.809169,
    "lng": 121.297066,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 29: Hidden Falls Path",
    "region": "Central Luzon",
    "difficulty": "EASY",
    "distanceKm": 16.1,
    "elevationGainM": 1182,
    "lat": 15.810389,
    "lng": 123.75828,
    "shortDescription": "A popular local loop with mild gradients and plenty of rest stops."
  },
  {
    "name": "Trail 30: Cloudline Traverse",
    "region": "Bicol",
    "difficulty": "EASY",
    "distanceKm": 21.4,
    "elevationGainM": 947,
    "lat": 12.482294,
    "lng": 124.507387,
    "shortDescription": "A scenic route with sweeping views and shaded sections\u2014great for a half\u2011day hike."
  },
  {
    "name": "Trail 31: Pine Ridge Loop",
    "region": "Central Luzon",
    "difficulty": "MODERATE",
    "distanceKm": 19.1,
    "elevationGainM": 294,
    "lat": 18.258749,
    "lng": 118.69697,
    "shortDescription": "Mixed terrain with steady climbs, rewarding ridge panoramas, and photo spots."
  },
  {
    "name": "Trail 32: Riverbend Ascent",
    "region": "Sierra Madre",
    "difficulty": "MODERATE",
    "distanceKm": 7.1,
    "elevationGainM": 235,
    "lat": 17.285965,
    "lng": 120.142074,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  },
  {
    "name": "Trail 33: Pine Ridge Loop",
    "region": "Sierra Madre",
    "difficulty": "MODERATE",
    "distanceKm": 13.9,
    "elevationGainM": 860,
    "lat": 17.898946,
    "lng": 119.777055,
    "shortDescription": "Forest trail with occasional streams; expect muddy patches after rain."
  },
  {
    "name": "Trail 34: Summit Spur",
    "region": "Visayas",
    "difficulty": "MODERATE",
    "distanceKm": 15.6,
    "elevationGainM": 514,
    "lat": 9.363245,
    "lng": 124.541221,
    "shortDescription": "A scenic route with sweeping views and shaded sections\u2014great for a half\u2011day hike."
  },
  {
    "name": "Trail 35: Pine Ridge Loop",
    "region": "Central Luzon",
    "difficulty": "MODERATE",
    "distanceKm": 13.5,
    "elevationGainM": 204,
    "lat": 12.419355,
    "lng": 122.401197,
    "shortDescription": "Mixed terrain with steady climbs, rewarding ridge panoramas, and photo spots."
  },
  {
    "name": "Trail 36: Ridge-to-Reef Route",
    "region": "Sierra Madre",
    "difficulty": "HARD",
    "distanceKm": 9.7,
    "elevationGainM": 294,
    "lat": 16.50568,
    "lng": 124.120797,
    "shortDescription": "Challenging ascent to a viewpoint; start early for cooler temps."
  }
];

async function main() {
  // Trails (idempotent-ish: wipe & reseed)
  await prisma.savedTrail.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.calendarEventLink.deleteMany();
  await prisma.hikePlan.deleteMany();
  await prisma.weatherSnapshot.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.jobRun.deleteMany();
  await prisma.trail.deleteMany();

  await prisma.trail.createMany({
    data: trails.map((t) => ({
      name: t.name,
      region: t.region,
      difficulty: t.difficulty as Difficulty,
      distanceKm: t.distanceKm,
      elevationGainM: t.elevationGainM,
      lat: t.lat,
      lng: t.lng,
      shortDescription: t.shortDescription
    }))
  });

  console.log(`Seeded ${trails.length} trails.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
