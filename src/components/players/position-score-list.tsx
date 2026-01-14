"use client";

import React from "react";
import {} from "@/types/players";
import { normalizedDefaultWeights, Position, ZoneScores } from "@/types/positions";
import {} from "@/types/stats";

type PositionScoreListProps = {
    zoneFit: ZoneScores;
};

export const PositionScoreList: React.FC<PositionScoreListProps> = ({ zoneFit }) => {
    const sortedPositions = Object.entries(normalizedDefaultWeights)
        .map(([pos, posWeight]) => ({
            pos,
            score: zoneFit[pos as Position] ?? 0,
            shortName: posWeight.shortName,
        }))
        .slice(1)
        .sort((a, b) => b.score - a.score);

    const getStatColor = (value: number) => {
        if (value >= 80) return "text-green-500"; // Good
        if (value >= 50) return "text-yellow-500"; // Medium
        return "text-red-500"; // Bad
    };

    return (
        <div className="w-full rounded-xl shadow p-3">
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
                {sortedPositions.map(({ pos, score, shortName }) => (
                    <div
                        key={pos}
                        className="flex flex-col items-center justify-center rounded-lg p-3 border border-accent/30 bg-accent/10 hover:bg-accent/20 transition shadow-sm"
                    >
                        <span className={`text-lg font-bold ${getStatColor(score)}`}>{score.toFixed(1)}</span>
                        <span className="text-sm font-medium">{shortName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
