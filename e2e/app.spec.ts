import fs from "node:fs";
const dataset = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/colleges.json", import.meta.url),
    "utf8",
  ),
) as { id: string; name: string }[];
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/play", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { corrections: {} } }),
  );
});
test("home, guess, persistence, settings and modal", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Guess the college." }),
  ).toBeVisible();
  await page.screenshot({
    path: `screenshots/home-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const input = page.getByRole("combobox");
  await input.fill("Harvard");
  await input.press("ArrowDown");
  await input.press("Enter");
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(page.locator(".guess-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".guess-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Hard mode · hide arrows").check();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Hard mode · hide arrows")).toBeChecked();
  await page.getByRole("button", { name: "Close dialog" }).click();
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
  await expect(
    page.getByRole("heading", { name: "Practice your college knowledge." }),
  ).toBeVisible();
  const answer = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cg-requested-ug-v1-practice")!).answer,
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
      () =>
        JSON.parse(localStorage.getItem("cg-requested-ug-v1-practice")!).answer,
    ),
  ).not.toBe(answer);
});
test("daily loss reveals answer", async ({ page }) => {
  await page.goto("/#daily");
  await expect(
    page.getByRole("heading", { name: "Guess the college." }),
  ).toBeVisible();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      /^cg-requested-ug-v1-\d{4}-/.test(k),
    )!;
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
        "cg-requested-ug-v1-" + r.date,
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
  await expect(
    page.getByRole("heading", { name: "Practice your college knowledge." }),
  ).toBeVisible();
  const answerId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cg-requested-ug-v1-practice")!).answer,
  );
  const incorrectSchool = dataset.find((c) => c.id !== answerId)!;
  await page.getByRole("combobox").fill(incorrectSchool.name);
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  const tiles = page.locator(".guess-row").first().locator(".comparison-flip");
  await expect(tiles).toHaveCount(6);
  await expect(tiles.last()).toHaveAttribute(
    "aria-label",
    "Revealing Distance clue",
  );
  await expect(page.getByRole("combobox")).toBeDisabled();
  await expect(tiles.first()).toHaveAttribute("aria-label", /^State:/);
  await expect(tiles.last()).toHaveAttribute(
    "aria-label",
    "Revealing Distance clue",
  );
  await expect(tiles.last()).toHaveAttribute("aria-label", /^Distance:/);
  await expect(page.getByRole("combobox")).toBeEnabled();
  await page.reload();
  await expect(page.locator(".comparison-flip.is-flipping")).toHaveCount(0);
  await expect(page.locator(".comparison-flip").last()).toHaveAttribute(
    "aria-label",
    /^Distance:/,
  );
});

test("reduced motion reveals clues immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#practice");
  await expect(
    page.getByRole("heading", { name: "Practice your college knowledge." }),
  ).toBeVisible();
  await page.getByRole("combobox").fill("Harvard");
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(page.locator(".comparison-flip.is-flipping")).toHaveCount(0);
  await expect(page.locator(".comparison-flip").last()).toHaveAttribute(
    "aria-label",
    /^Distance:/,
  );
});

test("white background, six clues and functional academic rank", async ({
  page,
}) => {
  await page.goto("/#practice");
  await expect(
    page.getByRole("heading", { name: "Practice your college knowledge." }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const answerId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cg-requested-ug-v1-practice")!).answer,
  );
  const school = dataset.find((c) => c.id !== answerId)!;
  await page.getByRole("combobox").fill(school.name);
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(page.locator(".comparison-flip")).toHaveCount(6);
  const rank = page.getByRole("button", { name: /^Academic rank:/ });
  await expect(rank).toHaveAttribute("aria-label", /#[0-9]+/);
  await expect(rank).not.toHaveAttribute("aria-label", /N\/A/);
  await expect(
    page.getByRole("button", { name: /^Distance:/ }),
  ).toHaveAttribute("aria-label", /mi [↑↗→↘↓↙←↖] (N|NE|E|SE|S|SW|W|NW)/);
  await expect(
    page.getByRole("button", { name: /^Distance:/ }),
  ).toHaveAttribute("aria-label", /[0-9,]+ mi.*straight-line campus-to-campus/);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    ),
  ).toBe("rgb(255, 255, 255)");
  await page.getByRole("button", { name: "Sources & methodology" }).click();
  await page.getByRole("button", { name: "View all 169 schools" }).click();
  await expect(page.locator(".pool-list>div")).toHaveCount(169);
});

test("map search zooms, shows city labels and chooses a real school", async ({
  page,
}) => {
  await page.goto("/#practice");
  await expect(
    page.getByRole("heading", { name: "Practice your college knowledge." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Search the map", exact: true })
    .click();
  const map = page.getByRole("group", {
    name: /Interactive United States college map/,
  });
  await expect(map).toBeVisible();
  await expect(page.locator(".map-state")).toHaveCount(51);
  expect(await page.locator(".map-pin").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".map-cities text").first()).toBeAttached();
  expect(Number(await map.getAttribute("data-zoom"))).toBeGreaterThan(2);
  await page.locator(".map-pin").first().focus();
  await page.locator(".map-pin").first().press("Enter");
  await expect(page.getByLabel("Colleges at selected pin")).toBeVisible();
  const popup = page.getByLabel("Colleges at selected pin");
  const popupBounds = await popup.boundingBox();
  const canvasBounds = await page.locator(".map-canvas").boundingBox();
  expect(popupBounds!.y).toBeGreaterThanOrEqual(canvasBounds!.y);
  expect(popupBounds!.x).toBeGreaterThanOrEqual(canvasBounds!.x);
  expect(popupBounds!.x + popupBounds!.width).toBeLessThanOrEqual(
    canvasBounds!.x + canvasBounds!.width,
  );
  // Its arrow points to the clicked map position, above the pin rather than below the map.
  const anchorY = await popup.evaluate(
    (el) => parseFloat((el as HTMLElement).style.top) + 32,
  );
  expect(popupBounds!.y + popupBounds!.height).toBeLessThan(
    canvasBounds!.y + anchorY,
  );
  expect(
    await popup.evaluate((el) => {
      const card = el as HTMLElement,
        canvas = card.closest(".map-canvas")!;
      const bounds = canvas.getBoundingClientRect();
      const x =
        bounds.left +
        parseFloat(card.style.left) +
        parseFloat(card.style.getPropertyValue("--pin-offset"));
      const y = bounds.top + parseFloat(card.style.top) + 32;
      return [...canvas.querySelectorAll<SVGGElement>(".map-pin")].some(
        (pin) => {
          const matrix = pin.getScreenCTM();
          if (!matrix) return false;
          const p = new DOMPoint(0, 0).matrixTransform(matrix);
          return Math.hypot(p.x - x, p.y - y) < 2;
        },
      );
    }),
  ).toBeTruthy();
  await page.screenshot({
    path: `screenshots/map-popup-${test.info().project.name}.png`,
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Choose college", exact: true })
    .first()
    .click();
  await expect(page.getByRole("combobox")).not.toHaveValue("");
  await expect(page.locator(".college-map")).toHaveCount(0);
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect(page.locator(".guess-row")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /^Academic rank:/ }),
  ).toHaveAttribute("aria-label", /#[0-9]+/);
});

test("school list is alphabetical with academic ranks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sources & methodology" }).click();
  await page.getByRole("button", { name: "View all 169 schools" }).click();
  await expect(page.locator(".pool-list")).toContainText(
    /Academic rank #[0-9]+/,
  );
  const names = await page
    .locator(".pool-list>div>span")
    .evaluateAll((els) =>
      els.map((el) => el.childNodes[0].textContent!.trim()),
    );
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});

test("liberal arts and undergraduate counts, report submission and retry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox").fill("Williams");
  await expect(
    page.getByRole("option").filter({ hasText: "Williams College" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Report a bug", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Map test report");
  await page
    .getByLabel("What went wrong?")
    .fill("A test report with enough detail to reproduce.");
  await page.route("**/api/reports", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.context).not.toHaveProperty("answer");
    expect(body.context).not.toHaveProperty("guesses");
    await route.fulfill({
      status: 503,
      json: { error: "Temporarily unavailable" },
    });
  });
  await page.getByRole("button", { name: "Send bug report" }).click();
  await expect(page.getByRole("alert")).toContainText("not been sent");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Map test report",
  );
  await page.route("**/api/reports", (route) =>
    route.fulfill({ status: 201, json: { ok: true, id: "test-reference" } }),
  );
  await page.getByRole("button", { name: "Send bug report" }).click();
  await expect(page.getByRole("status")).toContainText("received");
});

test("only counts a submitted guess, and does not recount a reload", async ({
  page,
}) => {
  let events: unknown[] = [];
  await page.route("**/api/play", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/#practice");
  await expect(
    page.getByRole("heading", { name: "Practice your college knowledge." }),
  ).toBeVisible();
  expect(events).toHaveLength(0);
  await page.getByRole("combobox").fill("Harvard");
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: /Submit Guess/ }).click();
  await expect.poll(() => events.length).toBe(1);
  await page.reload();
  await expect(page.locator(".guess-row")).toHaveCount(1);
  expect(events).toHaveLength(1);
  expect(Object.keys(events[0] as object).sort()).toEqual([
    "mode",
    "roundId",
    "visitorId",
  ]);
});
