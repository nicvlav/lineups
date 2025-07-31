import { StatsKey, PlayerStats, CategorizedStats, StatCategory } from "@/data/stat-types"; // Importing from shared file
import { Point, PositionShortLabels, normalizedDefaultWeights, ZoneScores, emptyZoneScores, Weighting, Position } from "@/data/position-types"; // Importing from shared file

// Core Player data from Supabase
export interface Player {
    id: string;
    name: string;
    stats: PlayerStats;
}

export type PlayerUpdate = Partial<Player>;

// Local-only game-specific attributes
export interface GamePlayer {
    id: string; // null if a temporary guest player
    guest_name: string | null; // non null if a temporary guest player
    team: string;
    position: Point;
}

export type GamePlayerUpdate = Partial<GamePlayer>;

export interface FilledGamePlayer extends GamePlayer {
    stats: PlayerStats;
}
export interface ScoredGamePlayer extends GamePlayer {
    zoneFit: ZoneScores;
}

export interface ScoredGamePlayerWithThreat extends ScoredGamePlayer {
    threatScore: number;
}

export const interpolateColor = (c1: string, c2: string, t: number) => {
    const hex = (str: string) => parseInt(str, 16);
    const r1 = hex(c1.slice(1, 3)), g1 = hex(c1.slice(3, 5)), b1 = hex(c1.slice(5, 7));
    const r2 = hex(c2.slice(1, 3)), g2 = hex(c2.slice(3, 5)), b2 = hex(c2.slice(5, 7));
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
};

// Maps score (assumed in [0, 1]) through a nonlinear curve to enhance visual contrast
const skew = (x: number, exponent = 0.8) => Math.pow(x, exponent); // sqrt by default

export const getThreatColor = (score: number): string => {
    const colors = [
        { stop: 0.0, color: '#000003' },
        { stop: 0.15, color: '#1d0c3e' },
        { stop: 0.30, color: '#3f0c58' },
        { stop: 0.50, color: '#662d91' },
        { stop: 0.60, color: '#9e3a8b' },
        { stop: 0.70, color: '#d54f6e' },
        { stop: 0.75, color: '#f06359' },
        { stop: 0.80, color: '#ff8153' },
        { stop: 0.85, color: '#ff9d3f' },
        { stop: 0.90, color: '#ffcc2d' },
        { stop: 1.00, color: '#f7f7f7' },
    ];

    // Apply skew to emphasize differences among high values
    const adjusted = Math.min(1, Math.max(0, skew(score)));

    for (let i = 1; i < colors.length; i++) {
        const prev = colors[i - 1];
        const curr = colors[i];
        if (adjusted <= curr.stop) {
            const ratio = (adjusted - prev.stop) / (curr.stop - prev.stop);
            return interpolateColor(prev.color, curr.color, ratio);
        }
    }

    return colors[colors.length - 1].color;
};

export const calculateScoresForStats = (stats: PlayerStats, zoneWeights: Weighting): ZoneScores => {
    let zoneFit = structuredClone(emptyZoneScores);

    for (const zoneKey in zoneWeights) {
        const zone = zoneKey as keyof ZoneScores;
        const positionMap = zoneWeights[zone];

        let score = 0;
        for (const attr in positionMap.weights) {
            const attrKey = attr as StatsKey;
            const weight = positionMap.weights[attrKey];
            score += weight ? stats[attrKey] * weight : 0;
        }

        zoneFit[zone] = score;
        // console.log(zone, score)

    }

    return zoneFit;
};

export interface PositionAndScore {
    position: string;
    score: number;
}

export type ZoneAverages = Record<StatCategory, number>;

export function getAllPositions(player: Player): ZoneScores {
    return calculateScoresForStats(player.stats, normalizedDefaultWeights);
}

export function getTopPositions(zoneFit: ZoneScores): PositionAndScore[] {
    const allItems = Object.entries(zoneFit)
     .filter(([pos]) => pos !== "GK")
     .map(([pos, score]) => {
        return { position: PositionShortLabels[pos as Position], score } as PositionAndScore;
    }).sort((a, b) => {
        return b.score - a.score;
    }) as PositionAndScore[];

    const max = allItems[0].score;

    return allItems.splice(0, 3).filter((entry) => {
        return entry.score >= max * 0.97;
    });

}

export function getZoneAverages(player: Player): ZoneAverages {
    const result: ZoneAverages = {
        pace: 0,
        attacking: 0,
        passing: 0,
        dribbling: 0,
        defending: 0,
        physical: 0,
        morale: 0,
    };

    for (const [zone, stats] of Object.entries(CategorizedStats)) {
        const total = stats.reduce((sum, stat) => sum + player.stats[stat], 0);
        result[zone as StatCategory] = Math.round(total / stats.length);
    }

    return result;
}

