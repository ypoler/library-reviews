import { chromium } from "playwright";

const base = "http://localhost:5173";
const dir = "screenshots";
const modes = ["light", "dark"];

const browser = await chromium.launch();

for (const mode of modes) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: mode === "dark" ? "dark" : "light",
  });
  await ctx.addInitScript((m) => {
    localStorage.setItem("library-reviews-mode", m);
  }, mode);
  const page = await ctx.newPage();

  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${dir}/${mode}-home.png` });

  await page.goto(base + "/#/reviews", { waitUntil: "networkidle" });
  await page.waitForSelector("button[aria-expanded]", { timeout: 15000 });
  await page.locator("button[aria-expanded]").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${mode}-reviews.png` });

  await ctx.close();
  console.log("captured", mode);
}

await browser.close();
console.log("done");
