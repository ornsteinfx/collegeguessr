import { expect, it } from "vitest";
import { campusDistance, distanceBetween } from "../src/game/geography";
it("calculates Harvard to Penn as about 270 miles southwest, reversing toward the northeast", () => {
  const harvard = { latitude: 42.3744, longitude: -71.1169 },
    penn = { latitude: 39.9522, longitude: -75.1932 };
  const forward = campusDistance(harvard, penn),
    reverse = campusDistance(penn, harvard);
  expect(forward.miles).toBeGreaterThan(260);
  expect(forward.miles).toBeLessThan(280);
  expect(forward.direction).toBe("SW");
  expect(forward.arrow).toBe("↙");
  expect(reverse.direction).toBe("NE");
  expect(reverse.miles).toBe(forward.miles);
});
it("handles the same campus and missing campus data", () => {
  expect(distanceBetween("166027", "166027")).toEqual({
    miles: 0,
    direction: "",
    arrow: "",
  });
  expect(distanceBetween("missing", "166027")).toBeNull();
});
it.each([
  [10, 0, "N"],
  [-10, 0, "S"],
  [0, 10, "E"],
  [0, -10, "W"],
])(
  "points toward cardinal coordinates %s %s",
  (latitude, longitude, direction) => {
    expect(
      campusDistance(
        { latitude: 0, longitude: 0 },
        { latitude: Number(latitude), longitude: Number(longitude) },
      ).direction,
    ).toBe(direction);
  },
);

import { colleges, compare } from "../src/game/engine";
it("adds southwest miles as the sixth clue and respects hard mode", () => {
  const harvard = colleges.find((c) => c.id === "166027")!,
    penn = colleges.find((c) => c.id === "215062")!;
  expect(compare(harvard, penn)[5].value).toMatch(/mi ↙ SW/);
  expect(compare(harvard, penn)[5].hint).toContain("southwest");
  expect(compare(harvard, penn)[5].color).toBe("yellow");
  expect(compare(harvard, penn, true)[5].value).toMatch(/^[0-9,]+ mi$/);
  expect(compare(harvard, penn, true)[5].hint).not.toContain("southwest");
});
