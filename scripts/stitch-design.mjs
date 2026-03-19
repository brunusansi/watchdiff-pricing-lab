import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stitch } from "@google/stitch-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, ".stitch");

const prompt = [
  "Design a single-page desktop-first landing page for a product called WatchDiff Pricing Lab.",
  "Tone: industrial surveillance terminal, sharp borders, dark theme, phosphor green highlights, no generic SaaS look.",
  "Goal: showcase three SaaS pricing cards whose prices visibly change every 30 minutes, with monitoring-oriented copy and metadata panels.",
  "Must include: top monitoring status bar, hero copy about AI-powered web monitoring, pricing matrix, GitHub Pages deployment explanation, and a JSON snapshot CTA.",
  "Avoid: purple gradients, soft rounded cards, generic startup illustrations, dashboards with charts as the main focus.",
  "Target output should inspire a plain HTML/CSS implementation."
].join(" ");

async function main() {
  if (!process.env.STITCH_API_KEY) {
    throw new Error("Missing STITCH_API_KEY environment variable.");
  }

  const project = await stitch.createProject("WatchDiff Pricing Lab");
  const screen = await project.generate(prompt, "DESKTOP");
  const htmlUrl = await screen.getHtml();
  const imageUrl = await screen.getImage();

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "latest-result.json"),
    `${JSON.stringify(
      {
        prompt,
        projectId: project.projectId,
        screenId: screen.screenId,
        htmlUrl,
        imageUrl,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

await main();
