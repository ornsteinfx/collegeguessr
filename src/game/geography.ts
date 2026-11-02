import locations from "../data/campusLocations.json";
const radians = (degrees: number) => (degrees * Math.PI) / 180;
export function campusDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const a = radians(from.latitude),
    b = radians(to.latitude),
    delta = radians(to.longitude - from.longitude);
  const h =
    Math.sin((b - a) / 2) ** 2 +
    Math.cos(a) * Math.cos(b) * Math.sin(delta / 2) ** 2;
  const miles =
    3958.7613 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
  const bearing =
    ((Math.atan2(
      Math.sin(delta) * Math.cos(b),
      Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(delta),
    ) *
      180) /
      Math.PI +
      360) %
    360;
  const index = Math.round(bearing / 45) % 8;
  return {
    miles: Math.round(miles),
    direction:
      miles < 0.01 ? "" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][index],
    arrow: miles < 0.01 ? "" : ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][index],
  };
}
export function distanceBetween(from: string, to: string) {
  const a = locations[from as keyof typeof locations],
    b = locations[to as keyof typeof locations];
  return a && b ? campusDistance(a, b) : null;
}
