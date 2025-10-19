"use client";

import React, { useState } from "react";
import { StatsKey } from "@/data/stat-types";
import { ZoneAverages, Player } from "@/data/player-types";
import { ZoneScores } from "@/data/position-types";
import SharedPlayerStatsModal, { getPlayerAccent } from "@/components/dialogs/shared-player-stats-modal";

interface PlayerCardProps {
    player: Player; // Full player object for avatar access
    playerName: string;
    overall: number;
    zoneFit: ZoneScores
    top3Positions: string;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>; // Pass in full stats for breakdown
}

const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    playerName,
    overall,
    zoneFit,
    top3Positions,
    averages,
    stats,
}) => {
    const [open, setOpen] = useState(false);

    const handleOpenDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        setOpen(true);
    };

    const overallRounded = Math.round(overall); // Round to whole number

    const accent = getPlayerAccent(overallRounded);

    return (
        <>
            <div
                className={`select-none flex flex-col items-center bg-card/95 hover:bg-card hover:shadow-xl ${accent.border} transition-all duration-300 rounded-lg p-4 text-center cursor-pointer group hover:scale-[1.02] hover:-translate-y-1`}
                onContextMenu={handleOpenDialog}
                onDoubleClick={handleOpenDialog}
            >
                <div className="flex items-center w-full gap-2">
                    {/* Avatar or Badge */}
                    <div className="relative w-10 h-10 flex-shrink-0">
                        {player.avatar_url ? (
                            <>
                                <img 
                                    src={player.avatar_url} 
                                    alt={playerName}
                                    className="w-full h-full object-cover rounded-full shadow-lg"
                                    onError={(e) => {
                                        // Fallback to badge if image fails to load
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className={`font-bold text-xl rounded-full w-10 h-10 flex items-center justify-center border-2 text-white ${accent.badge}`}>
                                    {overallRounded}
                                </div>
                            </>
                        ) : (
                            <div className={`font-bold text-xl rounded-full w-10 h-10 flex items-center justify-center border-2 text-white ${accent.badge}`}>
                                {overallRounded}
                            </div>
                        )}
                        {/* Overall score overlay when avatar is present */}
                        {player.avatar_url && (
                            <div className={`absolute -bottom-1 -right-1 font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center border border-background text-white ${accent.badge.split(' ')[0]}`}>
                                {overallRounded}
                            </div>
                        )}
                    </div>

                    {/* Name + Positions */}
                    <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="font-semibold text-base text-foreground truncate w-full text-left">{playerName}</span>
                        <span className="text-xs text-muted-foreground">{top3Positions}</span>
                    </div>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    {[
                        { label: "TEC", value: averages.technical },
                        { label: "TAC", value: averages.tactical },
                        { label: "PHY", value: averages.physical },
                        { label: "MEN", value: averages.mental },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center bg-background/70 hover:bg-background/90 border border-border/30 hover:border-border/50 px-3 py-2 rounded-md transition-all duration-200 w-16"
                        >
                            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                            <span className="font-semibold text-foreground">{Math.round(stat.value)}</span>
                        </div>
                    ))}
                </div>

            </div>

            {/* Shared Player Stats Modal */}
            <SharedPlayerStatsModal
                player={player}
                isOpen={open}
                onClose={() => setOpen(false)}
                overall={overall}
                zoneFit={zoneFit}
                top3Positions={top3Positions}
                averages={averages}
                stats={stats}
            />
        </>
    );
};

export default PlayerCard;
