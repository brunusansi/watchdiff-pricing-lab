const dataElement = document.getElementById("lab-data");

if (!dataElement) {
  throw new Error("Missing embedded lab data.");
}

const labData = JSON.parse(dataElement.textContent ?? "{}");

const countdownElement = document.getElementById("countdown");
const nextChangeElement = document.getElementById("next-change");
const lastBuildElement = document.getElementById("last-build");
const bucketLabelElement = document.getElementById("bucket-label");

const numberScrambleAlphabet = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "$", "."];

function formatCountdown(targetIso) {
  const diffMs = new Date(targetIso).getTime() - Date.now();

  if (diffMs <= 0) {
    return "REFRESHING…";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function updateStatusPanel() {
  if (countdownElement) {
    countdownElement.textContent = formatCountdown(labData.nextChangeAt);
  }

  if (nextChangeElement) {
    nextChangeElement.textContent = labData.nextChangeLabel;
  }

  if (lastBuildElement) {
    lastBuildElement.textContent = labData.generatedAtLabel;
  }

  if (bucketLabelElement) {
    bucketLabelElement.textContent = labData.intervalLabel;
  }
}

function scrambleText(element) {
  const finalValue = element.dataset.value;

  if (!finalValue) {
    return;
  }

  let frame = 0;
  const totalFrames = 10;

  const timer = window.setInterval(() => {
    frame += 1;

    if (frame >= totalFrames) {
      element.textContent = finalValue;
      window.clearInterval(timer);
      return;
    }

    const scrambled = finalValue
      .split("")
      .map((character, index) => {
        if (character === "/" || character === " ") {
          return character;
        }

        if (index < frame) {
          return finalValue[index];
        }

        return numberScrambleAlphabet[Math.floor(Math.random() * numberScrambleAlphabet.length)];
      })
      .join("");

    element.textContent = scrambled;
  }, 45);
}

async function pollForFreshPricing() {
  try {
    const response = await fetch(`./data/pricing.json?ts=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return;
    }

    const latestData = await response.json();

    if (latestData.generatedAt !== labData.generatedAt) {
      window.location.reload();
    }
  } catch {
    // Ignore transient fetch failures; next poll will retry.
  }
}

updateStatusPanel();
window.setInterval(updateStatusPanel, 1000);
window.setInterval(pollForFreshPricing, 45000);

document.querySelectorAll("[data-scramble='price']").forEach((element) => {
  scrambleText(element);
});
