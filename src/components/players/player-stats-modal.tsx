/**
 * Player Stats Modal
 *
 * Opened from player cards or pitch players. Shows:
 * - Radar chart for zone averages (play style shape)
 * - Standout traits (top stats above player's own average)
 * - Position fit with archetype clusters and relative bars
 * - Admin-only detailed stats breakdown
 */

import { List } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import RadarChart, { calculateRadarAxes } from "@/components/players/radar-chart";

import RelativeArchetypeBars from "@/components/players/relative-archetype-bars";
import Modal from "@/components/shared/modal";
import { useAuth } from "@/context/auth-context";
import {
    getArchetypeTextColor,
    getRatingTierScheme,
    getStatBarColor,
    getStatTextColor,
    getTierBgClass,
    getTierCssVar,
} from "@/lib/color-system";
import { classifyPlayerByZone, getPlayStyleBuzzwords, getPrimaryArchetypeId } from "@/lib/player-quality";
import { getAllPositionArchetypeGroups, getTopPositionGroups } from "@/lib/positions/calculator";
import { calculateRelativeScore } from "@/lib/utils/relative-scoring";
import { getArchetypeById } from "@/types/archetypes";
import type { Player, PlayerArchetypeScores, ZoneAverages } from "@/types/players";
import type { Position } from "@/types/positions";
import { emptyZoneScores } from "@/types/positions";
import type { StatCategory, StatsKey } from "@/types/stats";
import { CategorizedStats, statLabelMap } from "@/types/stats";

interface ModernPlayerStatsModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    overall: number;
    archetypeScores: PlayerArchetypeScores;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>;
}

const ADMIN_USER_ID = "24115871-04fe-4111-b048-18f7e3e976fc";
const isAdmin = (userId: string | undefined): boolean => userId === ADMIN_USER_ID;

/** Number of standout traits to show */
const STANDOUT_COUNT = 4;
/** A stat must be this many points above the player's own average to count as standout */
const STANDOUT_THRESHOLD = 8;

const PlayerStatsModal: React.FC<ModernPlayerStatsModalProps> = ({
    player,
    isOpen,
    onClose,
    overall,
    archetypeScores,
    averages,
    stats,
}) => {
    const { user } = useAuth();
    const [showDetailedStats, setShowDetailedStats] = useState(false);
    const [showAllPositions, setShowAllPositions] = useState(false);

    // Compute standout traits — stats well above this player's own average
    const standoutTraits = useMemo(() => {
        const entries = Object.entries(stats) as [StatsKey, number][];
        const avg = entries.reduce((sum, [_, v]) => sum + v, 0) / (entries.length || 1);
        return entries
            .filter(([_, v]) => v - avg >= STANDOUT_THRESHOLD)
            .sort((a, b) => b[1] - a[1])
            .slice(0, STANDOUT_COUNT)
            .map(([key]) => statLabelMap[key]);
    }, [stats]);

    if (!player) return null;

    const overallRounded = Math.round(overall);
    const tierScheme = getRatingTierScheme(overallRounded);
    const tierBg = getTierBgClass(overallRounded);
    const tierVar = getTierCssVar(overallRounded);

    const primaryArchetypeId = getPrimaryArchetypeId(archetypeScores);
    const buzzwords = primaryArchetypeId ? getPlayStyleBuzzwords(primaryArchetypeId) : [];

    const zoneScores = structuredClone(emptyZoneScores);
    for (const position in archetypeScores) {
        zoneScores[position as Position] = archetypeScores[position].bestScore;
    }
    const zoneClassification = classifyPlayerByZone(zoneScores);

    const topPositionGroups = getTopPositionGroups(archetypeScores, 5, 3);
    const bestScore = topPositionGroups.length
        ? topPositionGroups[0].archetypes.reduce((prev, current) => (prev.score > current.score ? prev : current)).score
        : 0;
    const allPositionGroups = getAllPositionArchetypeGroups(archetypeScores);

    const values = Object.entries(stats).map(([_, value]) => value);
    const allStatAverage = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);

    return (
        <Modal title={player.name} isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[85vh] min-w-75 max-w-275">
                {/* Header — tier + zone + admin toggle */}
                <div className="border-b border-border/40 pt-3 pb-3 flex gap-3">
                    <div className={`w-0.5 rounded-full my-1 ${tierBg}`} />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded"
                                    style={{
                                        color: `var(${tierVar})`,
                                        backgroundColor: `color-mix(in oklch, var(${tierVar}), transparent 85%)`,
                                    }}
                                >
                                    {tierScheme.label}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                    {zoneClassification.specialistType}
                                </span>
                            </div>

                            {isAdmin(user?.id) && (
                                <button
                                    type="button"
                                    onClick={() => setShowDetailedStats(!showDetailedStats)}
                                    className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors font-medium"
                                >
                                    {showDetailedStats ? "Hide Numbers" : "Show Numbers"}
                                </button>
                            )}
                        </div>

                        {/* Buzzwords */}
                        {buzzwords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {buzzwords.map((word) => (
                                    <span
                                        key={word}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/40 bg-muted/40 text-foreground"
                                    >
                                        {word}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="mt-3 space-y-4 pb-4 px-1 overflow-y-auto custom-scrollbar">
                    {/* Radar chart + standout traits */}
                    <div className="flex flex-col items-center gap-3">
                        <RadarChart axes={calculateRadarAxes(averages)} size={200} tierRating={overallRounded} />

                        {/* Standout traits */}
                        {standoutTraits.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {standoutTraits.map((trait) => (
                                    <span
                                        key={trait}
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/50 text-foreground"
                                    >
                                        {trait}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Position Fit */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-sm font-semibold">Position Fit</h3>
                                <p className="text-[10px] text-muted-foreground">
                                    {showAllPositions ? "All positions" : "Top positions relative to best"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAllPositions(!showAllPositions)}
                                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                            >
                                <List className="w-3 h-3" />
                                {showAllPositions ? "Top" : "All"}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {(showAllPositions ? allPositionGroups : topPositionGroups).map((posGroup) => {
                                const position = posGroup.position;
                                const bestArchetypeId =
                                    "bestArchetypeId" in posGroup
                                        ? posGroup.bestArchetypeId
                                        : (posGroup.archetypes.find((a) => a.isBest)?.archetypeId ?? "");
                                const archetypes =
                                    "allArchetypes" in posGroup ? posGroup.allArchetypes : posGroup.archetypes;

                                const archetypeData = getArchetypeById(bestArchetypeId);
                                const bestArchetype =
                                    archetypes.find((a) => a.archetypeId === bestArchetypeId) ?? archetypes[0];

                                return (
                                    <div key={position} className="bg-card border border-border/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <span className="font-bold text-sm">{position}</span>
                                                {archetypeData && (
                                                    <span className="text-[10px] text-muted-foreground ml-2">
                                                        {archetypeData.strengthLabels.slice(0, 2).join(" · ")}
                                                    </span>
                                                )}
                                            </div>
                                            {showDetailedStats && bestArchetype && (
                                                <span
                                                    className={`text-xs font-semibold ${getArchetypeTextColor(
                                                        calculateRelativeScore(bestArchetype.score, bestScore)
                                                    )}`}
                                                >
                                                    {Math.round(bestArchetype.score)}
                                                </span>
                                            )}
                                        </div>

                                        <RelativeArchetypeBars
                                            archetypes={archetypes.map((a) => ({
                                                archetypeId: a.archetypeId,
                                                score: a.score,
                                            }))}
                                            bestScore={bestScore}
                                            maxVisibleDefault={showAllPositions ? 999 : 3}
                                            showNumbers={showDetailedStats}
                                            compact={true}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Admin: Detailed Stats */}
                    {isAdmin(user?.id) && showDetailedStats && (
                        <div className="space-y-3 pt-2 border-t border-border/30">
                            {/* Summary */}
                            <div className="flex gap-4 text-xs">
                                <div className="flex gap-1">
                                    <span className="text-muted-foreground">Overall:</span>
                                    <span className={`font-bold ${getStatTextColor(overallRounded)}`}>
                                        {overallRounded}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <span className="text-muted-foreground">Avg:</span>
                                    <span className={`font-bold ${getStatTextColor(allStatAverage)}`}>
                                        {Math.round(allStatAverage)}
                                    </span>
                                </div>
                            </div>

                            {/* Category breakdown */}
                            {Object.entries(CategorizedStats).map(([category, keys]) => {
                                const avg = averages[category as StatCategory] ?? 0;
                                const avgRounded = Math.round(avg);

                                return (
                                    <div key={category} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-xs uppercase tracking-wider">{category}</h4>
                                            <span className={`text-xs font-bold ${getStatTextColor(avgRounded)}`}>
                                                {avgRounded}
                                            </span>
                                        </div>

                                        <div className="w-full h-2 bg-muted rounded-full">
                                            <div
                                                className={`${getStatBarColor(avgRounded)} h-2 rounded-full`}
                                                style={{ width: `${Math.min(avgRounded, 100)}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5">
                                            {keys.map((key) => {
                                                const statRounded = Math.round(stats[key] ?? 0);
                                                return (
                                                    <div
                                                        key={key}
                                                        className="flex justify-between items-center bg-muted/30 rounded px-2 py-1"
                                                    >
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {statLabelMap[key]}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold tabular-nums ${getStatTextColor(statRounded)}`}
                                                        >
                                                            {statRounded}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PlayerStatsModal;
