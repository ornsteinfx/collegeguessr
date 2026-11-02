import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { select } from "d3-selection";
import {
  zoom,
  zoomIdentity,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { colleges, type College } from "../game/engine";
import topology from "../data/usStates.json";
import locations from "../data/campusLocations.json";
import cities from "../data/mapCities.json";
const W = 960,
  H = 550;
const projection = geoAlbersUsa()
  .translate([W / 2, H / 2])
  .scale(1170);
const path = geoPath(projection);
const states = (
  feature(
    topology as unknown as Topology,
    topology.objects.states as unknown as GeometryCollection,
  ) as FeatureCollection<Geometry, { name: string }>
).features.filter((f) => Number(f.id) < 60);
projection.fitExtent(
  [
    [18, 18],
    [W - 18, H - 18],
  ],
  { type: "FeatureCollection", features: states },
);
const abbreviations: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};
const point = (id: string) => {
  const l = locations[id as keyof typeof locations];
  return projection([l.longitude, l.latitude])!;
};
type Cluster = { x: number; y: number; schools: College[] };
export default function CollegeMap({
  excluded,
  selected,
  onSelect,
  disabled,
}: {
  excluded: string[];
  selected: string | null;
  onSelect: (c: College) => void;
  disabled: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null),
    container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLDivElement>(null),
    popup = useRef<HTMLDivElement>(null),
    panForPopup = useRef(false),
    behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [view, setView] = useState<ZoomTransform>(zoomIdentity),
    [width, setWidth] = useState(960),
    [active, setActive] = useState<string[]>([]),
    [activePoint, setActivePoint] = useState<[number, number] | null>(null),
    [tip, setTip] = useState("");
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!svg.current) return;
    const element = select(svg.current);
    const z = zoom<SVGSVGElement, unknown>()
      .extent([
        [0, 0],
        [W, H],
      ])
      .scaleExtent([1, 32])
      .translateExtent([
        [-50, -40],
        [W + 50, H + 40],
      ])
      .on("zoom", (e) => setView(e.transform));
    behavior.current = z;
    element.call(z);
    return () => {
      element.on(".zoom", null);
    };
  }, []);
  const factor = W / Math.max(280, width),
    unit = factor / view.k;
  const clusters = useMemo(() => {
    const result: Cluster[] = [];
    const radius = (25 * factor) / view.k;
    // Alphabetical grouping is independent of the answer and academic ranks.
    for (const school of [...colleges].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const p = point(school.id);
      if (!p) continue;
      const c = result.find((c) => Math.hypot(c.x - p[0], c.y - p[1]) < radius);
      if (c) c.schools.push(school);
      else result.push({ x: p[0], y: p[1], schools: [school] });
    }
    return result;
  }, [factor, view.k]);
  const visibleClusters = clusters.filter((c) => {
    const x = c.x * view.k + view.x,
      y = c.y * view.k + view.y;
    return x >= -20 && x <= W + 20 && y >= -20 && y <= H + 20;
  });
  const cityThreshold = view.k >= 5 ? 75000 : view.k >= 3 ? 250000 : 750000;
  const visibleCities = useMemo(() => {
    const boxes: { x: number; y: number; width: number }[] = [];
    return cities
      .filter((c) => c.population >= cityThreshold)
      .filter((city) => {
        const p = projection([city.longitude, city.latitude]);
        if (!p) return false;
        const x = (p[0] * view.k + view.x) / factor + 4,
          y = (p[1] * view.k + view.y) / factor - 14,
          w = city.name.length * 5.8 + 5;
        if (x < 0 || x > width || y < 0 || y > H / factor) return false;
        if (
          boxes.some(
            (b) =>
              x < b.x + b.width + 7 &&
              x + w + 7 > b.x &&
              Math.abs(y - b.y) < 18,
          )
        )
          return false;
        boxes.push({ x, y, width: w });
        return true;
      });
  }, [view, cityThreshold, factor, width]);
  function changeZoom(multiplier: number) {
    if (svg.current && behavior.current)
      select(svg.current).call(behavior.current.scaleBy, multiplier);
  }
  function activate(cluster: Cluster) {
    setActivePoint([cluster.x, cluster.y]);
    panForPopup.current = true;
    setActive(cluster.schools.map((c) => c.id));
    setTip("");
    if (
      cluster.schools.length > 1 &&
      view.k < 24 &&
      svg.current &&
      behavior.current
    ) {
      const k = Math.min(32, view.k * 2.2);
      select(svg.current).call(
        behavior.current.transform,
        zoomIdentity
          .translate(W / 2 - cluster.x * k, H / 2 - cluster.y * k)
          .scale(k),
      );
    }
  }
  const activeSchools = colleges
    .filter((c) => active.includes(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Use the SVG screen transform so the popup also tracks mobile letterboxing.
  const matrix = svg.current?.getScreenCTM();
  const bounds = canvas.current?.getBoundingClientRect();
  const screen =
    activePoint && matrix
      ? new DOMPoint(...view.apply(activePoint)).matrixTransform(matrix)
      : null;
  const anchor =
    screen && bounds
      ? { x: screen.x - bounds.left, y: screen.y - bounds.top }
      : null;
  const popupWidth = Math.min(340, (bounds?.width ?? width) - 16);
  const popupLeft =
    anchor && bounds
      ? Math.max(
          popupWidth / 2 + 8,
          Math.min(bounds.width - popupWidth / 2 - 8, anchor.x),
        )
      : 0;
  const popupVisible =
    anchor &&
    bounds &&
    anchor.x >= 0 &&
    anchor.x <= bounds.width &&
    anchor.y >= 0 &&
    anchor.y <= (svg.current?.clientHeight ?? bounds.height);
  const mapBottom =
    matrix && bounds ? matrix.f - bounds.top + H * matrix.d : 300;
  useLayoutEffect(() => {
    if (
      !active.length ||
      !anchor ||
      !matrix ||
      !popup.current ||
      !panForPopup.current
    )
      return;
    panForPopup.current = false;
    const minimumY = popup.current.getBoundingClientRect().height + 40;
    const maximumY = mapBottom - 12;
    const shiftY = Math.max(minimumY, Math.min(maximumY, anchor.y)) - anchor.y;
    const shiftX = bounds
      ? Math.max(24, Math.min(bounds.width - 24, anchor.x)) - anchor.x
      : 0;
    if ((shiftY || shiftX) && svg.current && behavior.current) {
      select(svg.current).call(
        behavior.current.transform,
        zoomIdentity
          .translate(view.x + shiftX / matrix.a, view.y + shiftY / matrix.d)
          .scale(view.k),
      );
    }
  }, [active, anchor?.x, anchor?.y, view, width]);
  return (
    <div className="college-map" ref={container}>
      <div className="map-toolbar">
        <span>{colleges.length} colleges · Click a red pin to choose</span>
        <div>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => changeZoom(1.7)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => changeZoom(1 / 1.7)}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Reset map"
            onClick={() => {
              if (svg.current && behavior.current)
                select(svg.current).call(
                  behavior.current.transform,
                  zoomIdentity,
                );
              setActive([]);
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="map-canvas" ref={canvas}>
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label="Interactive United States college map. Drag to pan, scroll or pinch to zoom."
          tabIndex={0}
          data-zoom={view.k.toFixed(2)}
        >
          <rect width={W} height={H} fill="#fff" />
          <g transform={view.toString()}>
            <g aria-hidden="true">
              {states.map((state) => (
                <path
                  key={String(state.id)}
                  d={path(state) ?? ""}
                  className="map-state"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g aria-hidden="true">
              {states.map((state) => {
                const [x, y] = path.centroid(state);
                if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                return (
                  <text
                    key={String(state.id)}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="map-state-label"
                    fontSize={12 * unit}
                    strokeWidth={3 * unit}
                  >
                    {view.k >= 3
                      ? state.properties.name
                      : abbreviations[state.properties.name]}
                  </text>
                );
              })}
            </g>
            {view.k >= 1.8 && (
              <g aria-hidden="true" className="map-cities">
                {visibleCities.map((c) => {
                  const p = projection([c.longitude, c.latitude]);
                  if (!p) return null;
                  return (
                    <g
                      key={`${c.name}-${c.longitude}`}
                      transform={`translate(${p[0]},${p[1]})`}
                    >
                      <circle r={1.8 * unit} />
                      <text
                        x={4 * unit}
                        y={-4 * unit}
                        fontSize={11 * unit}
                        strokeWidth={3 * unit}
                      >
                        {c.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
            <g>
              {visibleClusters.map((cluster) => {
                const school = cluster.schools[0],
                  multiple = cluster.schools.length > 1,
                  guessed = cluster.schools.every((s) =>
                    excluded.includes(s.id),
                  ),
                  chosen = cluster.schools.some((s) => s.id === selected);
                const label = multiple
                  ? `${cluster.schools.length} colleges near ${school.city}. Zoom to explore.`
                  : `${school.name}, ${school.city}, ${school.state}${guessed ? ". Already guessed." : ""}`;
                return (
                  <g
                    key={cluster.schools.map((c) => c.id).join("-")}
                    transform={`translate(${cluster.x},${cluster.y}) scale(${unit})`}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    className={`map-pin ${guessed ? "guessed" : ""} ${chosen ? "chosen" : ""}`}
                    onClick={() => activate(cluster)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activate(cluster);
                      }
                    }}
                    onMouseEnter={() => setTip(label)}
                    onMouseLeave={() => setTip("")}
                    onFocus={() => setTip(label)}
                    onBlur={() => setTip("")}
                  >
                    <circle r="18" cy="-8" fill="transparent" />
                    <path
                      className="pin-body"
                      d="M0 1C-3-4-9-8-9-14a9 9 0 1 1 18 0c0 6-6 10-9 15Z"
                    />
                    {multiple ? (
                      <text
                        x="0"
                        y="-10"
                        textAnchor="middle"
                        className="pin-count"
                      >
                        {cluster.schools.length}
                      </text>
                    ) : (
                      <path
                        className="pin-school"
                        d="m-5-15 5-4 5 4h-1v7H-4v-7Zm4 7v-4h2v4M-2-15v2m4-2v2"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
        {activeSchools.length > 0 && (
          <div
            className="map-selection"
            ref={popup}
            aria-label="Colleges at selected pin"
            style={
              {
                left: popupLeft,
                top: (anchor?.y ?? 0) - 32,
                width: popupWidth,
                visibility: popupVisible ? "visible" : "hidden",
                "--pin-offset": `${(anchor?.x ?? 0) - popupLeft}px`,
              } as CSSProperties
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setActive([]);
              }
            }}
          >
            <div className="map-selection-heading">
              <strong>
                {activeSchools.length === 1
                  ? "Selected college"
                  : `${activeSchools.length} colleges in this area`}
              </strong>
              <button
                type="button"
                aria-label="Close map selection"
                onClick={() => setActive([])}
              >
                ×
              </button>
            </div>
            <div
              className="map-selection-list"
              style={{
                maxHeight: Math.min(210, mapBottom - 120),
              }}
            >
              {activeSchools.map((c) => (
                <div key={c.id}>
                  <span>
                    <b>{c.name}</b>
                    <small>
                      {c.city}, {c.state}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={disabled || excluded.includes(c.id)}
                    onClick={() => {
                      onSelect(c);
                      setActive([]);
                    }}
                  >
                    {excluded.includes(c.id)
                      ? "Already guessed"
                      : "Choose college"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <span className="map-hover" role="status">
          {tip ||
            "Drag to pan · Scroll or pinch to zoom · Grouped pins separate as you zoom"}
        </span>
      </div>
      <div className="map-attribution">
        Campus locations: NCES · Boundaries: US Census / us-atlas · Cities:
        Natural Earth
      </div>
    </div>
  );
}
