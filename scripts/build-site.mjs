import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const docsDir = path.join(rootDir, "docs");
const dataDir = path.join(docsDir, "data");

const HALF_HOUR_MS = 30 * 60 * 1000;
const repoUrl = "https://github.com/brunusansi/watchdiff-pricing-lab";

const planDefinitions = [
  {
    name: "Pulse",
    note: "5 monitored pages",
    basePrice: 29,
    deltaPattern: [0, 6, -4, 12, -2, 9],
    tonePattern: [
      "Baseline capture",
      "Promo pressure",
      "Defensive discount",
      "Upsell burst",
      "Market correction",
      "Retention tweak"
    ],
    badgePattern: [
      "STABLE",
      "PRICE PUSH",
      "PROMO DROP",
      "BUNDLE TEST",
      "REBALANCED",
      "UPSELL ACTIVE"
    ],
    summary:
      "Entry plan for teams that want pricing movement obvious enough to trip semantic monitoring, not just screenshot diffs.",
    features: ["Homepage + pricing page checks", "AI change summaries", "JSON snapshot feed"]
  },
  {
    name: "Vector",
    note: "25 monitored pages",
    basePrice: 89,
    deltaPattern: [0, 10, -6, 14, -8, 18],
    tonePattern: [
      "Team baseline",
      "Expansion push",
      "Competitive response",
      "Feature-pack markup",
      "Quarter-end discount",
      "Seat-value increase"
    ],
    badgePattern: [
      "CALIBRATED",
      "ARPU TEST",
      "COMPETITOR MATCH",
      "FEATURE SURCHARGE",
      "DISCOUNT WINDOW",
      "VALUE RESET"
    ],
    summary:
      "Mid-market tier where pricing, packaging, and feature framing mutate together to mimic live SaaS experiments.",
    features: ["Rendered page diffs", "Feature + copy drift alerts", "30-minute snapshot history"]
  },
  {
    name: "Beacon",
    note: "Unlimited monitored pages",
    basePrice: 189,
    deltaPattern: [0, 22, -10, 34, -16, 28],
    tonePattern: [
      "Enterprise baseline",
      "Urgency markup",
      "Procurement softening",
      "Annual contract push",
      "Retention exception",
      "Expansion quota push"
    ],
    badgePattern: [
      "LOCKED",
      "ENTERPRISE PUSH",
      "PROCUREMENT DROP",
      "ANNUAL BUNDLE",
      "EXCEPTION PATH",
      "QUOTA ACTIVE"
    ],
    summary:
      "High-signal enterprise card with larger delta swings so AI monitors can classify real pricing intent quickly.",
    features: ["Priority semantic scoring", "Custom diff thresholds", "Webhook + audit export"]
  }
];

function formatUtc(date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(date);
}

function formatIntervalLabel(bucketStart) {
  const bucketEnd = new Date(bucketStart.getTime() + HALF_HOUR_MS);
  const formatPart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  });

  return `${formatPart.format(bucketStart)}–${formatPart.format(bucketEnd)} UTC`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildLabData(now = new Date()) {
  const intervalIndex = Math.floor(now.getTime() / HALF_HOUR_MS);
  const bucketStart = new Date(intervalIndex * HALF_HOUR_MS);
  const nextChange = new Date(bucketStart.getTime() + HALF_HOUR_MS);

  const plans = planDefinitions.map((plan, planIndex) => {
    const cycleIndex = intervalIndex % plan.deltaPattern.length;
    const previousCycleIndex = (cycleIndex + plan.deltaPattern.length - 1) % plan.deltaPattern.length;
    const currentPrice = plan.basePrice + plan.deltaPattern[cycleIndex];
    const previousPrice = plan.basePrice + plan.deltaPattern[previousCycleIndex];
    const changeAmount = currentPrice - previousPrice;

    return {
      ...plan,
      id: `${plan.name.toLowerCase()}-${intervalIndex}`,
      currentPrice,
      previousPrice,
      changeAmount,
      featured: planIndex === 1,
      tone: plan.tonePattern[cycleIndex],
      badge: `${plan.badgePattern[cycleIndex]} // ${Math.abs(changeAmount) === 0 ? "NO DELTA" : `DELTA ${changeAmount > 0 ? "+" : ""}${changeAmount}`}`
    };
  });

  return {
    generatedAt: now.toISOString(),
    generatedAtLabel: formatUtc(now),
    intervalIndex,
    intervalLabel: formatIntervalLabel(bucketStart),
    nextChangeAt: nextChange.toISOString(),
    nextChangeLabel: formatUtc(nextChange),
    repoUrl,
    plans
  };
}

function renderPriceCards(plans) {
  return plans
    .map((plan) => {
      const deltaPrefix = plan.changeAmount > 0 ? "▲" : plan.changeAmount < 0 ? "▼" : "•";
      const deltaClass = plan.changeAmount >= 0 ? "delta delta--up" : "delta delta--down";
      const featuredClass = plan.featured ? " pricing-card--featured" : "";

      return `
        <article class="pricing-card${featuredClass}" aria-label="${escapeHtml(plan.name)} pricing card">
          <div class="card__topline">
            <span class="card__badge">${escapeHtml(plan.badge)}</span>
            <div class="card__title-row">
              <div class="card__title-copy">
                <h3 class="card__tier">${escapeHtml(plan.name)}</h3>
                <div class="card__tier-note">${escapeHtml(plan.note)}</div>
              </div>
              <div class="${deltaClass}">[ ${deltaPrefix} ${plan.changeAmount > 0 ? "+" : ""}${formatCurrency(plan.changeAmount)} ]</div>
            </div>
          </div>

          <div class="card__price-block">
            <span class="price-old">${escapeHtml(formatCurrency(plan.previousPrice))}/mo</span>
            <strong class="price-current" data-fit-price>
              <span class="price-current__value" data-scramble="price" data-value="${escapeHtml(formatCurrency(plan.currentPrice))}">
                ${escapeHtml(formatCurrency(plan.currentPrice))}
              </span>
              <small class="price-current__period">/mo</small>
            </strong>
          </div>

          <p class="card__summary">${escapeHtml(plan.summary)}</p>

          <ul class="card__features">
            ${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
          </ul>

          <div class="card__footer">
            <div class="card__tier-note">CURRENT STRATEGY // ${escapeHtml(plan.tone)}</div>
            <a class="button" href="./data/pricing.json">inspect live snapshot</a>
          </div>
        </article>
      `.trim();
    })
    .join("\n");
}

async function main() {
  const labData = buildLabData();
  const templatePath = path.join(srcDir, "index.template.html");
  const template = await readFile(templatePath, "utf8");

  const pageHtml = template
    .replace("__PRICE_CARDS__", renderPriceCards(labData.plans))
    .replace('{"pending":true}', JSON.stringify(labData))
    .replace("__INTERVAL_LABEL__", labData.intervalLabel)
    .replace("__LAST_BUILD_LABEL__", labData.generatedAtLabel)
    .replace("__NEXT_CHANGE_LABEL__", labData.nextChangeLabel)
    .replace("__REPO_URL__", labData.repoUrl);

  await mkdir(dataDir, { recursive: true });
  await copyFile(path.join(srcDir, "styles.css"), path.join(docsDir, "styles.css"));
  await copyFile(path.join(srcDir, "script.js"), path.join(docsDir, "script.js"));
  await writeFile(path.join(docsDir, "index.html"), pageHtml, "utf8");
  await writeFile(path.join(docsDir, "404.html"), pageHtml, "utf8");
  await writeFile(path.join(dataDir, "pricing.json"), `${JSON.stringify(labData, null, 2)}\n`, "utf8");
}

await main();
