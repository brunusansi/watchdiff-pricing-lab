const HALF_HOUR_MS = 30 * 60 * 1000;
const dataElement = document.getElementById("lab-data");

if (!(dataElement instanceof HTMLScriptElement)) {
  throw new Error("Missing embedded lab data.");
}

const labData = JSON.parse(dataElement.textContent ?? "{}");

const priceContainers = Array.from(document.querySelectorAll("[data-fit-price]"));
const deltaContainers = Array.from(document.querySelectorAll("[data-fit-delta]"));
const planCards = Array.from(document.querySelectorAll("[data-plan-name]"));
const bucketLabelElement = document.getElementById("bucket-label");
const nextChangeElement = document.getElementById("next-change");

const MAX_PRICE_FONT_SIZE = 76;
const MIN_PRICE_FONT_SIZE = 28;

const MAX_DELTA_FONT_SIZE = 12; // Base approx size for clamp(0.66rem, 0.72vw, 0.75rem) on small screens
const MIN_DELTA_FONT_SIZE = 8;

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

function getCurrentIntervalIndex(now = Date.now()) {
  return Math.floor(now / HALF_HOUR_MS);
}

function buildPlanState(plan, intervalIndex) {
  const cycleIndex = intervalIndex % plan.deltaPattern.length;
  const previousCycleIndex = (cycleIndex + plan.deltaPattern.length - 1) % plan.deltaPattern.length;
  const currentPrice = plan.basePrice + plan.deltaPattern[cycleIndex];
  const previousPrice = plan.basePrice + plan.deltaPattern[previousCycleIndex];
  const changeAmount = currentPrice - previousPrice;
  const deltaPrefix = changeAmount > 0 ? "▲" : changeAmount < 0 ? "▼" : "•";

  return {
    badge: `${plan.badgePattern[cycleIndex]} // ${Math.abs(changeAmount) === 0 ? "NO DELTA" : `DELTA ${changeAmount > 0 ? "+" : ""}${changeAmount}`}`,
    currentPrice,
    previousPrice,
    changeAmount,
    deltaText: `[ ${deltaPrefix} ${changeAmount > 0 ? "+" : ""}${formatCurrency(changeAmount)} ]`,
    isPositive: changeAmount >= 0,
    tone: plan.tonePattern[cycleIndex]
  };
}

function syncMeta(now = Date.now()) {
  const bucketStart = new Date(getCurrentIntervalIndex(now) * HALF_HOUR_MS);
  const nextChange = new Date(bucketStart.getTime() + HALF_HOUR_MS);

  if (bucketLabelElement) {
    bucketLabelElement.textContent = formatIntervalLabel(bucketStart);
  }

  if (nextChangeElement) {
    nextChangeElement.textContent = formatUtc(nextChange);
  }
}

function syncPlanCards(now = Date.now()) {
  const intervalIndex = getCurrentIntervalIndex(now);

  planCards.forEach((card) => {
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const planName = card.dataset.planName;

    if (!planName) {
      return;
    }

    const plan = labData.plans.find((candidate) => candidate.name === planName);

    if (!plan) {
      return;
    }

    const state = buildPlanState(plan, intervalIndex);
    const badge = card.querySelector("[data-plan-field='badge']");
    const deltaChip = card.querySelector("[data-plan-field='delta-chip']");
    const deltaValue = card.querySelector("[data-plan-field='delta-value']");
    const previousPrice = card.querySelector("[data-plan-field='previous-price']");
    const currentPrice = card.querySelector("[data-plan-field='current-price']");
    const tone = card.querySelector("[data-plan-field='tone']");

    if (badge) {
      badge.textContent = state.badge;
    }

    if (deltaValue) {
      deltaValue.textContent = state.deltaText;
    }

    if (deltaChip instanceof HTMLElement) {
      deltaChip.classList.toggle("delta--up", state.isPositive);
      deltaChip.classList.toggle("delta--down", !state.isPositive);
    }

    if (previousPrice) {
      previousPrice.textContent = `${formatCurrency(state.previousPrice)}/mo`;
    }

    if (currentPrice instanceof HTMLElement) {
      const priceText = formatCurrency(state.currentPrice);
      currentPrice.textContent = priceText;
      currentPrice.dataset.value = priceText;
    }

    if (tone) {
      tone.textContent = `CURRENT STRATEGY // ${state.tone}`;
    }
  });
}

function fitPriceText(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.style.fontSize = `${MAX_PRICE_FONT_SIZE}px`;

  let fontSize = MAX_PRICE_FONT_SIZE;

  while (fontSize > MIN_PRICE_FONT_SIZE && container.scrollWidth > container.clientWidth) {
    fontSize -= 1;
    container.style.fontSize = `${fontSize}px`;
  }
}

function fitDeltaText(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }
  
  // Clear any inline font size to let the CSS clamp() recalculate the base size
  container.style.fontSize = "";
  
  // Get the computed font size so we respect the responsive clamp()
  const computedStyle = window.getComputedStyle(container);
  let fontSize = parseFloat(computedStyle.fontSize) || MAX_DELTA_FONT_SIZE;

  while (fontSize > MIN_DELTA_FONT_SIZE && container.scrollWidth > container.clientWidth) {
    fontSize -= 0.5;
    container.style.fontSize = `${fontSize}px`;
  }
}

function fitAllPrices() {
  priceContainers.forEach((container) => {
    fitPriceText(container);
  });
  deltaContainers.forEach((container) => {
    fitDeltaText(container);
  });
}

function scheduleLayoutFit() {
  window.requestAnimationFrame(() => {
    fitAllPrices();
  });
}

let nextBucketTimer;

function syncLivePricing() {
  const now = Date.now();
  syncMeta(now);
  syncPlanCards(now);
  scheduleLayoutFit();
}

function scheduleNextBucketSync() {
  if (typeof nextBucketTimer === "number") {
    window.clearTimeout(nextBucketTimer);
  }

  const now = Date.now();
  const nextBoundary = (getCurrentIntervalIndex(now) + 1) * HALF_HOUR_MS;
  const delay = Math.max(250, nextBoundary - now + 250);

  nextBucketTimer = window.setTimeout(() => {
    syncLivePricing();
    scheduleNextBucketSync();
  }, delay);
}

syncLivePricing();
scheduleNextBucketSync();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncLivePricing();
    scheduleNextBucketSync();
  }
});

window.addEventListener("resize", scheduleLayoutFit);
