/**
 * Radar/Spider Chart for Player Play Style
 *
 * SVG hexagonal visualization with 6 play-style axes.
 * The shape immediately communicates what kind of player this is —
 * a striker spikes ATK, a playmaker spikes CRE, a defender spikes DEF.
 */

import type React from "react";
import { getTierCssVar } from "@/lib/color-system";
import type { ZoneAverages } from "@/types/players";
import { type StatCategory, StatCategoryKeys, StatCategoryShortMap } from "@/types/stats";

interface RadarAxis {
    label: string;
    value: number; // 0-100
}

interface RadarChartProps {
    axes: RadarAxis[];
    size?: number;
    tierRating: number;
}

/** Build radar axes from pre-calculated category averages */
export function calculateRadarAxes(averages: ZoneAverages): RadarAxis[] {
    return StatCategoryKeys.map((key: StatCategory) => ({
        label: StatCategoryShortMap[key],
        value: averages[key],
    }));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(angleRad),
        y: cy + radius * Math.sin(angleRad),
    };
}

const RadarChart: React.FC<RadarChartProps> = ({ axes, size = 200, tierRating }) => {
    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * 0.34;
    const labelRadius = size * 0.45;
    const tierVar = getTierCssVar(tierRating);
    const angleStep = 360 / axes.length;

    const rings = [0.25, 0.5, 0.75, 1.0];

    const dataPoints = axes.map((axis, i) => {
        const angle = i * angleStep;
        const r = (axis.value / 100) * maxRadius;
        return polarToCartesian(cx, cy, r, angle);
    });

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="select-none"
            role="img"
            aria-label="Player play style radar chart"
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

            {/* Data polygon */}
            <polygon
                points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={`var(${tierVar})`}
                fillOpacity={0.15}
                stroke={`var(${tierVar})`}
                strokeWidth={2}
                strokeLinejoin="round"
            />

            {/* Data points */}
            {dataPoints.map((p, i) => (
                <circle key={`dot-${axes[i].label}`} cx={p.x} cy={p.y} r={3} fill={`var(${tierVar})`} />
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
