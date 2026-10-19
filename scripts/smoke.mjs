const raw = process.argv[2] ?? process.env.PRODUCTION_URL ?? "";
if (raw === "") {
  console.error("usage: node scripts/smoke.mjs <url>");
  process.exit(1);
}

const deadline = Date.now() + 60_000;
let last = "no response";

while (Date.now() <= deadline) {
  try {
    const sitesResponse = await fetch(new URL("/api/sites", raw), { cache: "no-store" });
    const sitesText = await sitesResponse.text();
    let count = -1;
    try {
      const body = JSON.parse(sitesText);
      count = Array.isArray(body.sites) ? body.sites.length : -1;
    } catch {
      count = -1;
    }
    const cache = sitesResponse.headers.get("cache-control") ?? "";
    const noStore = cache.split(",").some((part) => part.trim().toLowerCase() === "no-store");
    const homeResponse = await fetch(new URL("/", raw), { cache: "no-store" });
    const homeText = await homeResponse.text();
    const listResponse = await fetch(new URL("/sites", raw), { cache: "no-store" });
    const listText = await listResponse.text();
    // The Guide's heading and the list's name, as the pages read them (docs/ui-design.md, UI refresh 2026-10-19).
    const homeOk = homeResponse.status === 200 && new URL(homeResponse.url).pathname === "/about-this-demo" && homeText.includes("Is the crew good to go?");
    const listOk = listResponse.status === 200 && listText.includes("Projects");
    const pagesOk = homeOk && listOk;
    if (sitesResponse.status === 200 && noStore && count === 4 && pagesOk) {
      console.log("smoke ok");
      process.exit(0);
    }
    last = `sites ${sitesResponse.status} cache ${cache || "missing"} count ${count} home ${homeResponse.status}${homeOk ? "" : " (content missing)"} list ${listResponse.status}${listOk ? "" : " (content missing)"}`;
  } catch (error) {
    last = error instanceof Error ? error.name : "request failed";
  }
  if (Date.now() > deadline) break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

console.error(`smoke failed: ${last}`);
process.exit(1);
