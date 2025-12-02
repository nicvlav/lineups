"use client";

import React, { useState } from "react";
import { StatsKey } from "@/types/stats";
import { ZoneAverages, Player, PlayerArchetypeScores } from "@/types/players";
import { Position } from "@/types/positions";
import { ZoneScores } from "@/types/positions";
import { getArchetypeById } from "@/types/archetypes";
import { getTopArchetypes } from "@/lib/positions/calculator";
import PlayerStatsModal from "@/components/players/player-stats-modal";
import { getCardUnderlineColor, getStatBarColor } from "@/lib/color-system";
import type { CardViewMode } from "./player-cards";

interface PlayerCardProps {
    player: Player;
    playerName: string;
    overall: number;
    zoneFit: ZoneScores;
    top3Positions: string;
    topScoresWithArchetypes: Array<{ position: Position; score: number; archetypeId: string }>;
    archetypeScores: PlayerArchetypeScores;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>;
    viewMode: CardViewMode;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    playerName,
    overall,
    zoneFit: _zoneFit,
    top3Positions: _top3Positions,
    topScoresWithArchetypes: _topScoresWithArchetypes,
    archetypeScores,
    averages,
    stats,
    viewMode,
}) => {
    const [open, setOpen] = useState(false);

    const handleOpenDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        setOpen(true);
    };

    const overallRounded = Math.round(overall);
    const accentColor = getCardUnderlineColor(overallRounded);

    // Get top 5 archetypes sorted by score (no threshold, just top 5)
    // Use 999 as threshold to effectively disable threshold filtering
    const topArchetypes = getTopArchetypes(archetypeScores, 5, 3);

    return (
        <>
            <div
                className="select-none flex flex-col bg-card/95 hover:bg-card hover:shadow-lg border border-border/30 hover:border-border/50 transition-all duration-200 rounded-lg p-3 cursor-pointer group"
                onContextMenu={handleOpenDialog}
                onDoubleClick={handleOpenDialog}
            >
                {/* Name + Avatar Row */}
                <div className="flex items-center gap-2 mb-2">
                    {player.avatar_url && (
                        <img
                            src={player.avatar_url}
                            alt={playerName}
                            className="w-8 h-8 object-cover rounded-full"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    )}
                    <span className="font-semibold text-sm text-foreground truncate flex-1">{playerName}</span>
                </div>

                {/* Subtle colored separator */}
                <div className={`h-0.5 w-full ${accentColor} rounded-full mb-3`} />

                {/* Conditional Content Based on View Mode */}
                {viewMode === "minimal" && (
                    // Minimal: Just name with underline (separator already shown above)
                    <div className="h-1" /> // Spacer for consistent height
                )}

                {viewMode === "archetypes" && (
                    // Archetypes: Top 5 Archetypes Block (always 5 rows for consistent height)
                    <div className="bg-muted/30 rounded-md p-2 space-y-1 mb-3">
                        {Array.from({ length: 5 }).map((_, index) => {
                            const archetypeData = topArchetypes[index];

                            if (!archetypeData) {
                                // Empty slot for consistent height
                                return (
                                    <div key={`empty-${index}`} className="h-4" />
                                );
                            }

                            const archetype = getArchetypeById(archetypeData.archetypeId);
                            if (!archetype) return <div key={`empty-${index}`} className="h-4" />;

                            return (
                                <div
                                    key={`${archetypeData.position}-${archetypeData.archetypeId}`}
                                    className="flex items-center gap-2 text-xs"
                                >
                                    <span className="font-semibold text-primary w-6 shrink-0">{archetypeData.position}</span>
                                    <span className="h-px flex-1 bg-border/40" />
                                    <span className="text-muted-foreground truncate">{archetype.name}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === "face-stats" && (
                    // Face Stats: Category Bars
                    <div className="space-y-1.5 mb-3">
                        {[
                            { label: "TEC", value: averages.technical },
                            { label: "TAC", value: averages.tactical },
                            { label: "MEN", value: averages.mental },
                            { label: "PHY", value: averages.physical },
                        ].map((stat) => {
                            const statRounded = Math.round(stat.value);
                            return (
                                <div key={stat.label} className="flex items-center gap-2">
                                    <span className="text-[9px] font-medium text-muted-foreground w-6 uppercase">
                                        {stat.label}
                                    </span>
                                    <div className="flex-1 h-1 bg-muted rounded-full">
                                        <div
                                            className={`${getStatBarColor(statRounded)} h-1 rounded-full transition-all duration-300`}
                                            style={{ width: `${Math.min(statRounded, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modern Player Stats Modal */}
            <PlayerStatsModal
                player={player}
                isOpen={open}
                onClose={() => setOpen(false)}
                overall={overall}
                archetypeScores={archetypeScores}
                averages={averages}
                stats={stats}
            />
        </>
    );
};

export default PlayerCard;
