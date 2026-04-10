/**
 * Radar/Spider Chart for Player Capabilities (V2)
 *
 * SVG hexagonal visualization with 6 capability axes.
 * Supports single player or dual-player overlay for comparison.
 * The shape immediately communicates what kind of player this is —
 * a defender spikes DEF, a playmaker spikes PLY, a striker spikes GOL.
 */

import type React from "react";
import { getTierCssVar } from "@/lib/color-system";
import type { PlayerCapabilities } from "@/types/traits";
import { CAPABILITY_KEYS, capabilityShortLabelMap } from "@/types/traits";

interface RadarAxis {
    label: string;
    value: number; // 0-100
}

interface RadarDataset {
    axes: RadarAxis[];
    tierRating: number;
}

interface RadarChartProps {
    axes: RadarAxis[];
    size?: number;
    tierRating: number;
    /** Optional second dataset for comparison overlay */
    compare?: RadarDataset;
    /** Override color for the compare polygon */
    compareColor?: string;
}

/** Build radar axes from player capabilities (6 axes) */
export function calculateRadarAxes(capabilities: PlayerCapabilities): RadarAxis[] {
    return CAPABILITY_KEYS.map((key) => ({
        label: capabilityShortLabelMap[key],
        value: capabilities[key],
    }));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(angleRad),
        y: cy + radius * Math.sin(angleRad),
    };
}

function buildPoints(axes: RadarAxis[], cx: number, cy: number, maxRadius: number, angleStep: number) {
    return axes.map((axis, i) => {
        const angle = i * angleStep;
        const r = (axis.value / 100) * maxRadius;
        return polarToCartesian(cx, cy, r, angle);
    });
}

const RadarChart: React.FC<RadarChartProps> = ({ axes, size = 200, tierRating, compare, compareColor }) => {
    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * 0.34;
    const labelRadius = size * 0.45;
    const angleStep = 360 / axes.length;

    const rings = [0.25, 0.5, 0.75, 1.0];

    const primaryVar = getTierCssVar(tierRating);
    const primaryPoints = buildPoints(axes, cx, cy, maxRadius, angleStep);

    const compareVarRaw = compare ? getTierCssVar(compare.tierRating) : null;
    const cmpColor = compareColor ?? (compareVarRaw ? `var(${compareVarRaw})` : null);
    const comparePoints = compare ? buildPoints(compare.axes, cx, cy, maxRadius, angleStep) : null;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="select-none"
            role="img"
            aria-label={compare ? "Player comparison radar chart" : "Player capability radar chart"}
        >
            {/* Background rings */}
            {rings.map((scale) => (
                <polygon
                    key={scale}
                    points={axes
                        .map((_, i) => {
                            const p = polarToCartesian(cx, cy, maxRadius * scale, i * angleStep);
                            return `${p.x},${p.y}`;
                        })
                        .join(" ")}
                    fill="none"
                    stroke="var(--border)"
                    strokeOpacity={scale === 1.0 ? 0.8 : 0.4}
                    strokeWidth={scale === 1.0 ? 1.5 : 1}
                    strokeDasharray={scale < 1.0 ? "3 3" : undefined}
                />
            ))}

            {/* Axis lines */}
            {axes.map((_, i) => {
                const p = polarToCartesian(cx, cy, maxRadius, i * angleStep);
                return (
                    <line
                        key={`axis-${axes[i].label}`}
                        x1={cx}
                        y1={cy}
                        x2={p.x}
                        y2={p.y}
                        stroke="var(--border)"
                        strokeOpacity={0.5}
                        strokeWidth={1}
                    />
                );
            })}

            {/* Compare polygon (drawn first, behind primary) */}
            {comparePoints && cmpColor && (
                <>
                    <polygon
                        points={comparePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill={cmpColor}
                        fillOpacity={0.08}
                        stroke={cmpColor}
                        strokeOpacity={0.5}
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        strokeDasharray="4 3"
                    />
                    {comparePoints.map((p, i) => (
                        <circle
                            key={`cmp-dot-${axes[i].label}`}
                            cx={p.x}
                            cy={p.y}
                            r={2.5}
                            fill={cmpColor}
                            fillOpacity={0.5}
                        />
                    ))}
                </>
            )}

            {/* Primary polygon */}
            <polygon
                points={primaryPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={`var(${primaryVar})`}
                fillOpacity={compare ? 0.12 : 0.15}
                stroke={`var(${primaryVar})`}
                strokeWidth={2}
                strokeLinejoin="round"
            />

            {/* Primary data points */}
            {primaryPoints.map((p, i) => (
                <circle key={`dot-${axes[i].label}`} cx={p.x} cy={p.y} r={3} fill={`var(${primaryVar})`} />
            ))}

            {/* Labels */}
            {axes.map((axis, i) => {
                const p = polarToCartesian(cx, cy, labelRadius, i * angleStep);
                return (
                    <text
                        key={`label-${axis.label}`}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-muted-foreground text-[11px] font-semibold"
                    >
                        {axis.label}
                    </text>
                );
            })}
        </svg>
    );
};

export default RadarChart;
