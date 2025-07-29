"use client";

import React, { useState } from "react";
import { StatCategory, StatsKey, statLabelMap, CategorizedStats } from "@/data/stat-types";
import { ZoneAverages, } from "@/data/player-types";
import Modal from "@/components/dialogs/modal";

interface PlayerCardProps {
    playerName: string;
    overall: number;
    top3Positions: string;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>; // Pass in full stats for breakdown
}

const PlayerCard: React.FC<PlayerCardProps> = ({
    playerName,
    overall,
    top3Positions,
    averages,
    stats,
}) => {
    const [open, setOpen] = useState(false);

    const handleOpenDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        setOpen(true);
    };

    const getStatColor = (value: number) => {
        if (value >= 80) return "text-green-500"; // Good
        if (value >= 50) return "text-yellow-500"; // Medium
        return "text-red-500"; // Bad
    };

    const getBarColor = (value: number) => {
        if (value >= 80) return "bg-green-500";
        if (value >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };
    // Collect all morale stat keys
    const moraleKeys = CategorizedStats.morale;

    // Get only non-morale values
    const nonMoraleValues = Object.entries(stats)
        .filter(([key]) => !moraleKeys.includes(key as StatsKey))
        .map(([_, value]) => value);

    const allStatAverage = nonMoraleValues.reduce((sum, v) => sum + v, 0) /
        (nonMoraleValues.length || 1);

    return (
        <>
            <div
                className="select-none w-full h-auto flex flex-col items-center bg-gradient-to-b from-yellow-200 to-yellow-400 rounded-2xl text-black shadow-lg p-4 text-center cursor-pointer"
                onContextMenu={handleOpenDialog}
                onDoubleClick={handleOpenDialog}
            >
                <div className="flex items-center w-full gap-3 min-w-">
                    {/* Badge */}
                    <div className="bg-black text-white font-bold text-xl rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                        {overall}
                    </div>

                    {/* Name + Positions */}
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-lg text-left">{playerName}</span>
                        <span className="text-xs text-gray-700">{top3Positions}</span>
                    </div>
                </div>

                <div className="mt-3 flex justify-center gap-3">
                    {[
                        { label: "PAC", value: averages.pace },
                        { label: "ATT", value: averages.attacking },
                        { label: "PAS", value: averages.passing },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center bg-white/30 px-3 py-2 rounded-lg shadow-md w-16"
                        >
                            <span className="text-xs font-semibold">{stat.label}</span>
                            <span className="font-bold">{stat.value}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-3 flex justify-center gap-3">
                    {[
                        { label: "DRI", value: averages.dribbling },
                        { label: "DEF", value: averages.defending },
                        { label: "PHY", value: averages.physical },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center bg-white/30 px-3 py-2 rounded-lg shadow-md w-16"
                        >
                            <span className="text-xs font-semibold">{stat.label}</span>
                            <span className="font-bold">{stat.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popup dialog */}
            <Modal title={playerName} isOpen={open} onClose={() => setOpen(false)}>
                <div className="flex flex-col h-[80vh] min-w-[200px]">
                    <div className="grid grid-cols-[auto_max-content_auto] gap-x-2 p-1 text-sm sm:text-base font-bold tracking-wide">
                        <span>Overall:</span>
                        <span className={`${getStatColor(overall)}`}>{overall}</span>
                        <span>[{top3Positions}]</span>

                        <span>Average:</span>
                        <span className={`${getStatColor(allStatAverage)}`}>{allStatAverage.toFixed(0)}</span>
                        <span>[ALL STATS]</span>
                    </div>

                    <div >
                        {Object.entries(CategorizedStats)
                            .filter(([category]) => category !== "morale")
                            .map(([category, keys]) => {
                                const avg = averages[category as StatCategory] ?? 0;

                                return (
                                    <div className="mt-4 p-1" key={category}>
                                        <h3 className="font-bold text-sm sm:text-base tracking-wide mb-1">
                                            {category.toUpperCase()} (
                                            <span className={`text-sm font-bold ${getStatColor(avg ?? 0)}`}>
                                                {avg}
                                            </span>
                                            <span className="font-bold text-sm sm:text-base tracking-wide mb-1">)</span>
                                        </h3>

                                        {/* Progress bar */}
                                        <div className="w-full h-2 bg-gray-300 rounded mb-2">
                                            <div
                                                className={`${getBarColor(avg)} h-2 rounded`}
                                                style={{ width: `${avg}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 pb-2">
                                            {keys.map((key) => (
                                                <div
                                                    key={key}
                                                    className="flex justify-between items-center bg-accent rounded-lg p-2"
                                                >
                                                    <span className="text-sm font-medium p-1">{statLabelMap[key]}</span>
                                                    <span className={`text-sm font-bold ${getStatColor(stats[key] ?? 0)}`}>
                                                        {stats[key] ?? 0}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </Modal >
        </>
    );
};

export default PlayerCard;
