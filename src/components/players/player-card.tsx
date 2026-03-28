import type React from "react";
import { useState } from "react";
import PlayerStatsModal from "@/components/players/player-stats-modal";
import { useTapHandler } from "@/hooks/use-tap-handler";
import { getStatBarColor, getTierBorderClass } from "@/lib/color-system";
import { getTopArchetypes } from "@/lib/positions/calculator";
import { getArchetypeById } from "@/types/archetypes";
import type { Player, PlayerArchetypeScores, ZoneAverages } from "@/types/players";
import type { StatsKey } from "@/types/stats";
import type { CardViewMode } from "./player-cards";

interface PlayerCardProps {
    player: Player;
    playerName: string;
    overall: number;
    archetypeScores: PlayerArchetypeScores;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>;
    viewMode: CardViewMode;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    playerName,
    overall,
    archetypeScores,
    averages,
    stats,
    viewMode,
}) => {
    const [open, setOpen] = useState(false);

    // Use tap handler to distinguish between tap and scroll
    const tapHandlers = useTapHandler({
        onTap: () => setOpen(true),
        threshold: 10, // 10px movement threshold
    });

    const overallRounded = Math.round(overall);
    const tierBorder = getTierBorderClass(overallRounded);

    // Get top 5 archetypes sorted by score (no threshold, just top 5)
    const topArchetypes = getTopArchetypes(archetypeScores, 5, 3);
    const topPosition = topArchetypes[0]?.position;

    return (
        <>
            <div
                {...tapHandlers}
                className={`select-none flex flex-col bg-card/95 hover:bg-card hover:shadow-lg border border-border/20 border-l-2 ${tierBorder} hover:border-border/40 transition-all duration-200 rounded-lg p-3 cursor-pointer group`}
            >
                {/* Name + Position Row */}
                <div className="flex items-center gap-2 mb-2">
                    {player.avatar_url && (
                        <img
                            src={player.avatar_url}
                            alt={playerName}
                            className="w-8 h-8 object-cover rounded-full"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                    )}
                    <span className="font-semibold text-sm text-foreground truncate flex-1">{playerName}</span>
                    {topPosition && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                            {topPosition}
                        </span>
                    )}
                </div>

                {/* Conditional Content Based on View Mode */}
                {viewMode === "minimal" && (
                    // Minimal: Just name with underline (separator already shown above)
                    <div className="h-1" /> // Spacer for consistent height
                )}

                {viewMode === "archetypes" && (
                    // Archetypes: Top 5 Archetypes Block (always 5 rows for consistent height)
                    <div className="bg-muted/30 rounded-md p-2 space-y-1 mb-3">
                        {[0, 1, 2, 3, 4].map((slotIndex) => {
                            const archetypeData = topArchetypes[slotIndex];

                            if (!archetypeData) {
                                // Empty slot for consistent height
                                return <div key={`empty-slot-${slotIndex}`} className="h-4" />;
                            }

                            const archetype = getArchetypeById(archetypeData.archetypeId);
                            if (!archetype) return <div key={`missing-${archetypeData.archetypeId}`} className="h-4" />;

                            return (
                                <div
                                    key={`${archetypeData.position}-${archetypeData.archetypeId}`}
                                    className="flex items-center gap-2 text-xs"
                                >
                                    <span className="font-semibold text-primary w-6 shrink-0">
                                        {archetypeData.position}
                                    </span>
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
                                    <span className="text-xs font-medium text-muted-foreground w-6 uppercase">
                                        {stat.label}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-muted rounded-full">
                                        <div
                                            className={`${getStatBarColor(statRounded)} h-1.5 rounded-full transition-all duration-300`}
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
