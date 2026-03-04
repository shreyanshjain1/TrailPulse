export type TrailPhoto = {
  url: string;
  title: string;
  pageUrl: string;
  credit: string;
};

const WIKI_API = "https://commons.wikimedia.org/w/api.php";

function buildUrl(params: Record<string, string>) {
  const u = new URL(WIKI_API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export async function fetchWikimediaCategoryPhotos(
  category: string,
  limit = 5
): Promise<TrailPhoto[]> {
  if (!category) return [];

  // 1) Get files from category
  const catUrl = buildUrl({
    action: "query",
    format: "json",
    origin: "*",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmtype: "file",
    cmlimit: String(Math.min(50, Math.max(5, limit * 8))), // fetch more, then filter
  });

  const catRes = await fetch(catUrl, { headers: { "User-Agent": "TrailPulse/1.0" } });
  if (!catRes.ok) return [];
  const catJson: any = await catRes.json();
  const members: any[] = catJson?.query?.categorymembers ?? [];
  const titles: string[] = members.map((m) => m.title).filter(Boolean);

  if (!titles.length) return [];

  // 2) Get image URLs + attribution metadata
  const infoUrl = buildUrl({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1600",
    titles: titles.slice(0, 50).join("|"),
  });

  const infoRes = await fetch(infoUrl, { headers: { "User-Agent": "TrailPulse/1.0" } });
  if (!infoRes.ok) return [];
  const infoJson: any = await infoRes.json();
  const pages = infoJson?.query?.pages ?? {};

  const photos: TrailPhoto[] = [];
  for (const key of Object.keys(pages)) {
    const p = pages[key];
    const ii = p?.imageinfo?.[0];
    const url = ii?.thumburl || ii?.url;
    const title = p?.title;
    if (!url || !title) continue;

    const meta = ii?.extmetadata ?? {};
    const artist = meta?.Artist?.value ? stripHtml(meta.Artist.value) : "";
    const license = meta?.LicenseShortName?.value ? stripHtml(meta.LicenseShortName.value) : "";
    const credit = [artist, license].filter(Boolean).join(" • ") || "Wikimedia Commons";

    photos.push({
      url,
      title,
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
      credit,
    });

    if (photos.length >= limit) break;
  }

  return photos;
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}