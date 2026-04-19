import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import DottedMap from "dotted-map";
import { motion } from "motion/react";

/**
 * WorldMap — A dotted-SVG world map with animated geodesic arcs.
 *
 * Props
 * ─────
 *  dots       : Array<{ start: {lat,lng}, end: {lat,lng} }>
 *  lineColor  : string (default "#0ea5e9")
 */
export default function WorldMap({
  dots = [],
  lineColor = "#0ea5e9",
}) {
  const svgRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  // ── Generate the dotted map once ────────────────────────────────
  const svgMap = useMemo(() => {
    const map = new DottedMap({ height: 100, grid: "diagonal" });
    return map.getSVG({
      radius: 0.22,
      color: "#FFFFFF40",
      shape: "circle",
      backgroundColor: "transparent",
    });
  }, []);

  // ── Measure the rendered <svg> so we can overlay arcs ──────────
  useEffect(() => {
    const measure = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setSvgSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Project lat/lng → pixel x/y (Mercator-ish) ────────────────
  const project = useCallback(
    ({ lat, lng }) => {
      const x = ((lng + 180) / 360) * svgSize.width;
      const y =
        ((1 -
          Math.log(
            Math.tan((lat * Math.PI) / 180) +
              1 / Math.cos((lat * Math.PI) / 180)
          ) /
            Math.PI) /
          2) *
        svgSize.height;
      return { x, y };
    },
    [svgSize]
  );

  // ── Build a curved SVG path between two pixels ────────────────
  const createCurvedPath = useCallback((start, end) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50; // lift arc upward
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  }, []);

  return (
    <div
      className="world-map-wrapper"
      style={{
        width: "100%",
        aspectRatio: "2 / 1",
        position: "relative",
        overflow: "hidden",
        borderRadius: 8,
        background: "transparent",
      }}
    >
      {/* Dotted background map */}
      <img
        ref={svgRef}
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        alt="world map"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          userSelect: "none",
          display: "block",
        }}
      />

      {/* Animated arcs + endpoint dots */}
      {svgSize.width > 0 && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="5%" stopColor={lineColor} />
              <stop offset="95%" stopColor={lineColor} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {dots.map((connection, i) => {
            const start = project(connection.start);
            const end = project(connection.end);
            const d = createCurvedPath(start, end);

            return (
              <g key={`arc-${i}`}>
                {/* The arc path */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="url(#path-grad)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 1,
                    delay: 0.5 * i,
                    ease: "easeOut",
                  }}
                />

                {/* Start dot */}
                <circle cx={start.x} cy={start.y} r="2" fill={lineColor}>
                  <animate
                    attributeName="r"
                    values="2;4;2"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* End dot */}
                <circle cx={end.x} cy={end.y} r="2" fill={lineColor}>
                  <animate
                    attributeName="r"
                    values="2;4;2"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Glowing halos */}
                <circle
                  cx={start.x}
                  cy={start.y}
                  r="6"
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="0.5"
                  opacity="0.3"
                >
                  <animate
                    attributeName="r"
                    values="6;10;6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={end.x}
                  cy={end.y}
                  r="6"
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="0.5"
                  opacity="0.3"
                >
                  <animate
                    attributeName="r"
                    values="6;10;6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.3;0;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
