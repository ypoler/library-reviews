import { chromium } from "playwright";

const base = "http://localhost:5173";
const dir = "screenshots";

const browser = await chromium.launch();

async function run(mode, width) {
  const ctx = await browser.newContext({
    viewport: { width, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: mode === "dark" ? "dark" : "light",
  });
  await ctx.addInitScript((m) => {
    localStorage.setItem("library-reviews-mode", m);
  }, mode);
  const page = await ctx.newPage();

  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${dir}/m-${width}-${mode}-home.png` });

  await page.goto(base + "/#/reviews", { waitUntil: "networkidle" });
  await page.waitForSelector("button[aria-expanded]", { timeout: 15000 });
  await page.locator("button[aria-expanded]").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${dir}/m-${width}-${mode}-reviews.png`,
    fullPage: true,
  });

  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return {
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      overflowing: el.scrollWidth > el.clientWidth + 1,
    };
  });
  console.log(`${mode} @${width}px ->`, JSON.stringify(overflow));

  await ctx.close();
}

await run("light", 390);
await run("dark", 390);
await run("light", 320);

await browser.close();
console.log("done");
