import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const fallbackCovers = [
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

/**
 * 36 real PH trail targets.
 * photoCategory is Wikimedia Commons category string WITHOUT "Category:" prefix.
 * If category is null, gallery will show empty until you set one later.
 */
const phTrails: Array<{
  name: string;
  region: string;
  difficulty: Difficulty;
  photoCategory: string | null;
  shortDescription: string;
}> = [
  {
    name: "Mount Pulag (Ambangeg Trail)",
    region: "Benguet",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Pulag_National_Park",
    shortDescription:
      "The iconic ‘Sea of Clouds’ hike. Cold mornings, pine forests, and big summit views — perfect for first-time major climbs.",
  },
  {
    name: "Mount Apo",
    region: "Davao del Sur",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Apo",
    shortDescription:
      "The highest peak in the Philippines. Long days, changing terrain, and serious preparation required — a flagship climb.",
  },
  {
    name: "Mount Pinatubo (Crater Lake)",
    region: "Zambales / Tarlac / Pampanga",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Pinatubo_summit_caldera_with_lake",
    shortDescription:
      "A classic hike with 4x4 + trek to a stunning crater lake. Wide views, ash formations, and a rewarding finish.",
  },
  {
    name: "Mount Isarog",
    region: "Camarines Sur",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Isarog",
    shortDescription:
      "Bicol’s rainforest giant. Expect humidity, mossy trails, and tough ascents — ideal for endurance hikers.",
  },
  {
    name: "Mayon Volcano (Trail Areas)",
    region: "Albay",
    difficulty: Difficulty.HARD,
    photoCategory: "Mayon_Volcano",
    shortDescription:
      "A legendary cone volcano with dramatic scenery. Conditions vary — plan safely and check access rules.",
  },
  {
    name: "Mount Kanlaon",
    region: "Negros",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Kanlaon",
    shortDescription:
      "An active volcano hike. Strong winds, open ridges, and changing weather — go with proper guidance and permits.",
  },
  {
    name: "Mount Hibok-Hibok",
    region: "Camiguin",
    difficulty: Difficulty.HARD,
    photoCategory: "Hibok-Hibok",
    shortDescription:
      "Camiguin’s famous summit hike. Great views, but challenging climbs and heat exposure — start early and hydrate.",
  },
  {
    name: "Osmeña Peak",
    region: "Cebu",
    difficulty: Difficulty.EASY,
    photoCategory: "Osme%C3%B1a_Peak",
    shortDescription:
      "Short but scenic. A quick climb to jagged hills and panoramic views — perfect for sunrise/sunset trips.",
  },
  {
    name: "Mount Batulao",
    region: "Batangas",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Batulao",
    shortDescription:
      "A ridge hike with open grasslands and wind. Popular for day hikes — bring sun protection and water.",
  },
  {
    name: "Mount Maculot",
    region: "Batangas",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Maculot",
    shortDescription:
      "One of the best views of Taal Lake. Steep sections near the top — gloves help on rocky parts.",
  },
  {
    name: "Mount Daraitan",
    region: "Rizal",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Daraitan",
    shortDescription:
      "A favorite near Manila with river + limestone views. Slippery when wet — wear trail shoes with good grip.",
  },
  {
    name: "Masungi Georeserve Trail",
    region: "Rizal",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Masungi_Georeserve",
    shortDescription:
      "A guided conservation trail experience. Expect rope courses, viewpoints, and strict booking rules.",
  },
  {
    name: "Mount Ulap",
    region: "Benguet",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Ulap",
    shortDescription:
      "A popular Cordillera trail with pine forests and rolling ridges. Great for first-timers aiming for ‘major’ hikes.",
  },
  {
    name: "Mount Ugo",
    region: "Benguet / Nueva Vizcaya",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Ugo",
    shortDescription:
      "A long ridge trek with epic views. Best done with strong pacing — bring enough water and snacks.",
  },
  {
    name: "Mount Tapulao",
    region: "Zambales",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Tapulao",
    shortDescription:
      "A long day hike with rocky terrain. The reward is wide mountain views — endurance and strong legs needed.",
  },
  {
    name: "Mount Arayat",
    region: "Pampanga",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Arayat",
    shortDescription:
      "Steep jungle climbs and technical sections. Great training hike, but not beginner-friendly.",
  },
  {
    name: "Mount Makiling",
    region: "Laguna",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Mount_Makiling",
    shortDescription:
      "A classic Laguna hike with forest trails. Expect humidity, leeches in wet season, and steady inclines.",
  },
  {
    name: "Mount Banahaw",
    region: "Quezon / Laguna",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Banahaw",
    shortDescription:
      "A sacred mountain with rugged forest paths. Conditions and access rules vary — plan with locals/permits.",
  },
  {
    name: "Pico de Loro",
    region: "Cavite / Batangas",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Pico_de_Loro",
    shortDescription:
      "Iconic monolith with a steep final push. Great views — check current trail rules and registration requirements.",
  },
  {
    name: "Mount Mariveles",
    region: "Bataan",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Mariveles",
    shortDescription:
      "A major Bataan climb. Expect long ascents and forest sections — good training for multi-day hikes.",
  },
  {
    name: "Mount Samat (Bataan Trails)",
    region: "Bataan",
    difficulty: Difficulty.EASY,
    photoCategory: "Mount_Samat",
    shortDescription:
      "Historic site with easy routes around the area. Great for scenic walks and light hikes.",
  },
  {
    name: "Mount Kitanglad",
    region: "Bukidnon",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Kitanglad",
    shortDescription:
      "A major Mindanao climb with big views. Requires preparation and often guides/permits.",
  },
  {
    name: "Mount Kalatungan",
    region: "Bukidnon",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Kalatungan",
    shortDescription:
      "Challenging terrain and high elevation. Great for serious hikers building their major-mountain list.",
  },
  {
    name: "Mount Matutum",
    region: "South Cotabato",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Matutum",
    shortDescription:
      "A steep volcano climb with a dense forest approach. Weather can change quickly — pack layers.",
  },
  {
    name: "Lake Holon (Mount Parker / Melibengoy)",
    region: "South Cotabato",
    difficulty: Difficulty.MODERATE,
    photoCategory: "Lake_Holon",
    shortDescription:
      "A beautiful crater lake trek. One of the most scenic camping hikes — plan for cool nights.",
  },
  {
    name: "Mount Malindang",
    region: "Misamis Occidental",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Malindang",
    shortDescription:
      "A big mountain complex with forests and remote sections. Best for experienced hikers.",
  },
  {
    name: "Mount Talinis (Cuernos de Negros)",
    region: "Negros Oriental",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Talinis",
    shortDescription:
      "Cool mossy forests and crater features. Good for multi-day itineraries and experienced groups.",
  },
  {
    name: "Mount Guiting-Guiting",
    region: "Romblon",
    difficulty: Difficulty.HARD,
    photoCategory: "Guiting-Guiting",
    shortDescription:
      "One of the toughest in the country. Knife-edge ridges and technical climbing — only for trained groups.",
  },
  {
    name: "Mount Halcon",
    region: "Mindoro",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Halcon",
    shortDescription:
      "A notorious major climb with long jungle sections. Strong endurance and planning are required.",
  },
  {
    name: "Mount Mantalingajan",
    region: "Palawan",
    difficulty: Difficulty.HARD,
    photoCategory: "Mount_Mantalingajan",
    shortDescription:
      "Palawan’s highest peak. Remote and challenging — a true expedition-style hike.",
  },

  // ---- add 6 more popular PH hikes (category optional) ----
  {
    name: "Mount Talamitam",
    region: "Batangas",
    difficulty: Difficulty.EASY,
    photoCategory: null,
    shortDescription:
      "Beginner-friendly day hike with wide grassy slopes. Great training hike near the city.",
  },
  {
    name: "Mount Manabu",
    region: "Batangas",
    difficulty: Difficulty.EASY,
    photoCategory: null,
    shortDescription:
      "Short climb with forest sections and summit viewpoints. Nice quick hike for weekends.",
  },
  {
    name: "Mount Sembrano",
    region: "Rizal",
    difficulty: Difficulty.MODERATE,
    photoCategory: null,
    shortDescription:
      "A solid day hike with ridge-style sections. Expect heat exposure — start early.",
  },
  {
    name: "Mount Pamitinan",
    region: "Rizal",
    difficulty: Difficulty.MODERATE,
    photoCategory: null,
    shortDescription:
      "Limestone and rocky sections with quick climbs. Fun and technical in parts — gloves can help.",
  },
  {
    name: "Mount Kabunian",
    region: "Benguet",
    difficulty: Difficulty.HARD,
    photoCategory: null,
    shortDescription:
      "Cordillera climb with cultural routes and strong views. Steady ascent and endurance required.",
  },
  {
    name: "Mount Amuyao",
    region: "Mountain Province",
    difficulty: Difficulty.HARD,
    photoCategory: null,
    shortDescription:
      "A major Cordillera peak. Long days, steep climbs, and cold temps — prepare your layers and pacing.",
  },
];

function generatedLatLng(idx: number, difficulty: Difficulty) {
  // Keep deterministic but spread across PH-like lat/lng ranges
  // lat ~ 6-18, lng ~ 120-126
  const lat = 6.5 + (idx % 12) * 0.75 + (difficulty === Difficulty.HARD ? 0.15 : 0);
  const lng = 120.2 + (idx % 10) * 0.55 + (difficulty === Difficulty.MODERATE ? 0.2 : 0);
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function distanceFor(difficulty: Difficulty, idx: number) {
  if (difficulty === Difficulty.EASY) return Number((4.0 + (idx % 5) * 0.8).toFixed(1));
  if (difficulty === Difficulty.MODERATE) return Number((7.0 + (idx % 7) * 1.0).toFixed(1));
  return Number((10.0 + (idx % 9) * 1.2).toFixed(1));
}

function elevationFor(difficulty: Difficulty, idx: number) {
  if (difficulty === Difficulty.EASY) return 250 + (idx % 8) * 70;
  if (difficulty === Difficulty.MODERATE) return 450 + (idx % 10) * 110;
  return 900 + (idx % 12) * 160;
}

async function main() {
  // clear dependent tables first (FK-safe order)
  await prisma.review.deleteMany();
  await prisma.weatherSnapshot.deleteMany();
  await prisma.savedTrail.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.calendarEventLink.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.hikePlan.deleteMany();
  await prisma.trail.deleteMany();

  // Create trails one by one (safer for JSON fields)
  for (let idx = 0; idx < phTrails.length; idx++) {
    const t = phTrails[idx];

    const { lat, lng } = generatedLatLng(idx, t.difficulty);
    const distanceKm = distanceFor(t.difficulty, idx);
    const elevationGainM = elevationFor(t.difficulty, idx);

    const cover = fallbackCovers[idx % fallbackCovers.length];

    await prisma.trail.create({
      data: {
        name: t.name,
        region: t.region,
        difficulty: t.difficulty,
        distanceKm,
        elevationGainM,
        lat,
        lng,
        shortDescription: t.shortDescription,

        // old field (optional) — keep for compatibility
        imageUrl: cover,

        // new fields (optional) — recommended
        coverImageUrl: cover,
        photoCategory: t.photoCategory,

        routeGeoJson: makeRouteLine(lat, lng, idx),
        routeSections: makeRouteSections(lat, lng, idx),
      } as any,
    });
  }

  console.log(`✅ Seeded ${phTrails.length} PH trails with coverImageUrl + photoCategory + routeGeoJson + routeSections`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });