"use client";

import React, { useState } from "react";
import { StatCategory, StatsKey, statLabelMap, CategorizedStats } from "@/data/stat-types";
import { ZoneAverages, Player } from "@/data/player-types";
import { ZoneScores } from "@/data/position-types";
import { PositionScoreList } from "@/components/dialogs/position-score-list";
import Modal from "@/components/dialogs/modal";

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

    const overallRounded = Math.round(overall);

    // Ultra-modern borders-only accent system (2025 style)
    const getPlayerAccent = (rating: number) => {
        if (rating >= 80) return { 
            border: 'border-l-4 border-l-emerald-400/60 border-r border-t border-b border-border/40', 
            badge: 'bg-emerald-500 border-emerald-400' 
        }; // Elite - left accent stripe
        if (rating >= 70) return { 
            border: 'border-l-4 border-l-blue-400/60 border-r border-t border-b border-border/40', 
            badge: 'bg-blue-500 border-blue-400' 
        }; // Good - left accent stripe
        if (rating >= 60) return { 
            border: 'border-l-4 border-l-amber-400/60 border-r border-t border-b border-border/40', 
            badge: 'bg-amber-500 border-amber-400' 
        }; // Average - left accent stripe
        if (rating >= 50) return { 
            border: 'border-l-4 border-l-orange-400/60 border-r border-t border-b border-border/40', 
            badge: 'bg-orange-500 border-orange-400' 
        }; // Below avg - left accent stripe
        return { 
            border: 'border border-border/30', 
            badge: 'bg-slate-500 border-slate-400' 
        }; // Poor - no accent
    };

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
                                <div className={`hidden font-bold text-xl rounded-full w-10 h-10 flex items-center justify-center border-2 text-white ${accent.badge}`}>
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
                        { label: "PAC", value: averages.pace },
                        { label: "ATT", value: averages.attacking },
                        { label: "PAS", value: averages.passing },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center bg-background/70 hover:bg-background/90 border border-border/30 hover:border-border/50 px-3 py-2 rounded-md transition-all duration-200 w-16"
                        >
                            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                            <span className="font-semibold text-foreground">{stat.value}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-2 flex justify-center gap-2">
                    {[
                        { label: "DRI", value: averages.dribbling },
                        { label: "DEF", value: averages.defending },
                        { label: "PHY", value: averages.physical },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex flex-col items-center bg-background/70 hover:bg-background/90 border border-border/30 hover:border-border/50 px-3 py-2 rounded-md transition-all duration-200 w-16"
                        >
                            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                            <span className="font-semibold text-foreground">{stat.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popup dialog */}
            <Modal title={playerName} isOpen={open} onClose={() => setOpen(false)}>
                <div className="flex flex-col h-[80vh] min-w-[200px] max-w-[1000px]">
                    <div className="grid grid-cols-[auto_max-content_auto] gap-x-2 p-1 text-sm sm:text-base font-bold tracking-wide">
                        <span>OVERALL:</span>
                        <span className={`${getStatColor(overallRounded)}`}>{overallRounded}</span>
                        <span>[{top3Positions}]</span>

                        <span>AVERAGE:</span>
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

                    <div className="mt-4 p-1 text-sm sm:text-base font-bold tracking-wide">
                        <span>ALL POSITIONS:</span>
                    </div>

                    <div className=" h-[200px]"> {/* Allows it to grow/shrink */}
                        {/* <Panel> */}
                        <PositionScoreList zoneFit={zoneFit} />
                        {/* </Panel> */}
                    </div>

                </div>
            </Modal >
        </>
    );
};

export default PlayerCard;
