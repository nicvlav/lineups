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

    // Mobile long-press
    let pressTimer: NodeJS.Timeout;
    const handleTouchStart = () => {
        pressTimer = setTimeout(() => setOpen(true), 500);
    };
    const handleTouchEnd = () => clearTimeout(pressTimer);

    return (
        <>
            <div
                className="w-full h-auto flex flex-col items-center bg-gradient-to-b from-yellow-200 to-yellow-400 rounded-2xl text-black shadow-lg p-4 text-center cursor-pointer"
                onContextMenu={handleOpenDialog}
                onDoubleClick={handleOpenDialog}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
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
                    <div className="sticky top-0 bg-card shadow-md">
                        <div className="pt-2 pb-2 flex-col">
                            <span className="flex font-bold text-sm sm:text-base tracking-wide">
                                Overall: {overall} &nbsp;•&nbsp; [{top3Positions}]
                            </span>
                        </div>
                    </div>
                    <div >
                        {Object.entries(CategorizedStats)
                            .filter(([category]) => category !== "morale") // ⬅️ exclude morale
                            .map(([category, keys]) => (
                                <div className="mt-4" key={category}>
                                    <h3 className="font-bold text-sm sm:text-base tracking-wide mb-2">
                                        {category.toUpperCase()} ({averages[category as StatCategory]})
                                    </h3>

                                    <div className="grid grid-cols-2 gap-2">
                                        {keys.map((key) => (
                                            <div
                                                key={key}
                                                className="flex justify-between items-center bg-accent rounded-lg p-2"
                                            >
                                                <span className="text-sm font-medium">{statLabelMap[key]}</span>
                                                <span className="text-sm font-bold">{stats[key] ?? 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </Modal >
        </>
    );
};

export default PlayerCard;
