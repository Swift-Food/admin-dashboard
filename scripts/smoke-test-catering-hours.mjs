#!/usr/bin/env node
// Smoke test: fetches the real restaurant list from the live API and runs
// it through the same formatting logic shipped in
// src/pages/RestaurantScreen/RestaurantScreen.tsx (formatCateringHoursTime /
// formatCateringHours), to catch real-data shapes the unit-test fixtures
// don't cover (e.g. day names coming back capitalized from the API).
// Keep this in sync if that file's formatting logic changes.
//
// Usage: node scripts/smoke-test-catering-hours.mjs [baseUrl]
// Defaults to the production API this dashboard points at (src/constants).

const BASE_URL = process.argv[2] || "https://swiftfoods-32981ec7b5a4.herokuapp.com";

function formatCateringHoursTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function formatCateringHours(cateringOperatingHours) {
  if (!cateringOperatingHours || cateringOperatingHours.length === 0) return "Not set";
  const enabledDays = cateringOperatingHours.filter((s) => s.enabled);
  if (enabledDays.length === 0) return "No hours set";

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const byDay = new Map();
  for (const schedule of enabledDays) {
    const dayKey = schedule.day.toLowerCase();
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    if (schedule.open && schedule.close) {
      byDay.get(dayKey).push(`${formatCateringHoursTime(schedule.open)} - ${formatCateringHoursTime(schedule.close)}`);
    }
  }

  const grouped = [];
  for (const dayKey of dayOrder) {
    const slots = byDay.get(dayKey);
    if (!slots || slots.length === 0) continue;
    const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1, 3);
    const hours = slots.join(", ");
    const last = grouped[grouped.length - 1];
    if (last && last.hours === hours) last.days.push(dayName);
    else grouped.push({ days: [dayName], hours });
  }

  return grouped
    .map((g) => {
      const dayRange = g.days.length > 1 ? `${g.days[0]} - ${g.days[g.days.length - 1]}` : g.days[0];
      return `${dayRange}: ${g.hours}`;
    })
    .join(" | ");
}

async function main() {
  console.log(`Fetching real restaurant data from ${BASE_URL}/restaurant ...\n`);

  const res = await fetch(`${BASE_URL}/restaurant`);
  if (!res.ok) {
    console.error(`FAIL: GET /restaurant returned ${res.status}`);
    process.exit(1);
  }

  const restaurants = await res.json();
  if (!Array.isArray(restaurants) || restaurants.length === 0) {
    console.error("FAIL: expected a non-empty array of restaurants");
    process.exit(1);
  }

  let failures = 0;

  console.log(`Checked ${restaurants.length} restaurants.\n`);

  const featured = restaurants.filter((r) => r.featured);
  console.log(`Featured: ${featured.map((r) => r.restaurant_name).join(", ") || "(none)"}`);

  console.log("\nCatering hours (real data through the shipped formatting logic):");
  for (const r of restaurants) {
    if (!("featured" in r)) {
      console.error(`FAIL: ${r.restaurant_name} — response is missing the 'featured' field entirely`);
      failures++;
      continue;
    }
    if (!("cateringOperatingHours" in r)) {
      console.error(`FAIL: ${r.restaurant_name} — response is missing the 'cateringOperatingHours' field entirely`);
      failures++;
      continue;
    }

    let rendered;
    try {
      rendered = formatCateringHours(r.cateringOperatingHours);
    } catch (err) {
      console.error(`FAIL: ${r.restaurant_name} — formatCateringHours threw: ${err.message}`);
      failures++;
      continue;
    }

    if (!rendered || /undefined|NaN/.test(rendered)) {
      console.error(`FAIL: ${r.restaurant_name} — suspicious output: "${rendered}"`);
      failures++;
      continue;
    }

    console.log(`  ${r.restaurant_name.padEnd(30)} -> ${rendered}`);
  }

  console.log();
  if (failures > 0) {
    console.error(`FAIL: ${failures} restaurant(s) produced bad output.`);
    process.exit(1);
  }

  console.log("PASS: all restaurants rendered sane hours output against real production data.");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
