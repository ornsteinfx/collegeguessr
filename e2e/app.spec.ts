import fs from "node:fs";
const dataset = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/colleges.json", import.meta.url),
    "utf8",
  ),
) as { id: string; name: string }[];
import { test, expect } from "@playwright/test";
test("home, guess, persistence, settings and modal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /How well/ })).toBeVisible();
  await page.screenshot({
    path: `screenshots/home-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Play Today’s College" }).click();
  const input = page.getByRole("combobox");
  await input.fill("Harvard");
  await input.press("ArrowDown");
  await input.press("Enter");
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(page.locator(".guess-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".guess-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Dark appearance").check();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `screenshots/game-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("exact answer wins, statistics and practice restart", async ({ page }) => {
  await page.goto("/#practice");
  const answer = await page.evaluate(
    () => JSON.parse(localStorage.getItem("cg-v1-practice")!).answer,
  );
  const data = { default: dataset };
  const school = data.default.find((c) => c.id === answer)!;
  await page.getByRole("combobox").fill(school.name);
  await page
    .getByRole("option")
    .filter({ hasText: school.name })
    .first()
    .click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(
    page.getByRole("heading", { name: "You found it!" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(school.name);
  await page.getByRole("button", { name: "Play Again" }).click();
  await expect(page.locator(".guess-row")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("cg-v1-practice")!).answer,
    ),
  ).not.toBe(answer);
});
test("daily loss reveals answer", async ({ page }) => {
  await page.goto("/#daily");
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => /^cg-v1-\d{4}-/.test(k))!;
    const r = JSON.parse(localStorage.getItem(key)!);
    (window as unknown as { savedRound: unknown }).savedRound = r;
  });
  const r = await page.evaluate(
    () =>
      (window as unknown as { savedRound: { answer: string; date: string } })
        .savedRound,
  );
  const data = { default: dataset };
  await page.evaluate(
    ({ r, ids }) => {
      localStorage.setItem(
        "cg-v1-" + r.date,
        JSON.stringify({ ...r, mode: "daily", guesses: ids }),
      );
    },
    {
      r,
      ids: data.default
        .filter((c) => c.id !== r.answer)
        .slice(0, 8)
        .map((c) => c.id),
    },
  );
  await page.reload();
  await expect(page.getByRole("combobox")).toBeDisabled();
  await page.getByRole("button", { name: "View results" }).click();
  await expect(
    page.getByRole("heading", { name: "Better luck tomorrow." }),
  ).toBeVisible();
});
test("social preview", async ({ page }) => {
  if (test.info().project.name !== "desktop") return;
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto("/branding/social.svg");
  await page.screenshot({ path: "public/og-image.png" });
});

test("new clues flip in order, saved rows remain revealed", async ({
  page,
}) => {
  await page.goto("/#practice");
  const answerId = await page.evaluate(() => JSON.parse(localStorage.getItem("cg-v1-practice")!).answer);
  const incorrectSchool = dataset.find(c => c.id !== answerId)!;
  await page.getByRole("combobox").fill(incorrectSchool.name);
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  const tiles = page.locator(".guess-row").first().locator(".comparison-flip");
  await expect(tiles).toHaveCount(6);
  await expect(tiles.last()).toHaveAttribute(
    "aria-label",
    "Revealing Conference clue",
  );
  await expect(page.getByRole("combobox")).toBeDisabled();
  await expect(tiles.first()).toHaveAttribute("aria-label", /^State:/);
  await expect(tiles.last()).toHaveAttribute(
    "aria-label",
    "Revealing Conference clue",
  );
  await expect(tiles.last()).toHaveAttribute("aria-label", /^Conference:/);
  await expect(page.getByRole("combobox")).toBeEnabled();
  await page.reload();
  await expect(page.locator(".comparison-flip.is-flipping")).toHaveCount(0);
  await expect(page.locator(".comparison-flip").last()).toHaveAttribute(
    "aria-label",
    /^Conference:/,
  );
});

test("reduced motion reveals clues immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#practice");
  await page.getByRole("combobox").fill("Harvard");
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(page.locator(".comparison-flip.is-flipping")).toHaveCount(0);
  await expect(page.locator(".comparison-flip").last()).toHaveAttribute(
    "aria-label",
    /^Conference:/,
  );
});
