/**
 * Modern Player Stats Modal
 *
 * Completely redesigned player stats popup with:
 * - Relative archetype visualization (always starts at 100%)
 * - Quality level indicators with centralized star system
 * - Specialist determination with play style descriptors
 * - Responsive grid layout (stacks on mobile)
 * - Admin-only detailed stats section
 */

import { List } from "lucide-react";
import React, { useState } from "react";
import PlayerQualityIndicator from "@/components/players/player-quality-indicator";
import RelativeArchetypeBars from "@/components/players/relative-archetype-bars";
import Modal from "@/components/shared/modal";
import Panel, { PanelSection } from "@/components/shared/panel";
import { useAuth } from "@/context/auth-context";
import { getArchetypeTextColor, getStatBarColor, getStatTextColor } from "@/lib/color-system";
import { classifyPlayerByZone, getPlayStyleBuzzwords, getPrimaryArchetypeId } from "@/lib/player-quality";
import { getAllPositionArchetypeGroups, getTopPositionGroups } from "@/lib/positions/calculator";
import { calculateRelativeScore } from "@/lib/utils/relative-scoring";
import { getArchetypeById } from "@/types/archetypes";
import { Player, PlayerArchetypeScores, ZoneAverages } from "@/types/players";
import { emptyZoneScores, Position } from "@/types/positions";
import { CategorizedStats, StatCategory, StatsKey, statLabelMap } from "@/types/stats";

interface ModernPlayerStatsModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    overall: number;
    archetypeScores: PlayerArchetypeScores;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>;
}

// Admin check
const ADMIN_USER_ID = "24115871-04fe-4111-b048-18f7e3e976fc";
const isAdmin = (userId: string | undefined): boolean => {
    if (!userId) return false;
    return userId === ADMIN_USER_ID;
};

// Color utilities now imported from unified color system

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

    if (!player) return null;

    const overallRounded = Math.round(overall);

    // Get specialist info
    const primaryArchetypeId = getPrimaryArchetypeId(archetypeScores);
    const buzzwords = primaryArchetypeId ? getPlayStyleBuzzwords(primaryArchetypeId) : [];

    const zoneScores = structuredClone(emptyZoneScores);

    for (const position in archetypeScores) {
        zoneScores[position as Position] = archetypeScores[position].bestScore;
    }

    // Get zone classification
    const zoneClassification = classifyPlayerByZone(zoneScores);

    // Get top position groups with threshold
    const topPositionGroups = getTopPositionGroups(archetypeScores, 5, 3);

    // Get top position groups with threshold
    const bestScore = topPositionGroups.length
        ? topPositionGroups[0].archetypes.reduce((prev, current) => {
              return prev.score > current.score ? prev : current;
          }).score
        : 0;

    // Get ALL position groups for expanded view
    const allPositionGroups = getAllPositionArchetypeGroups(archetypeScores);

    // Calculate stats for admin view
    const values = Object.entries(stats).map(([_, value]) => value);
    const allStatAverage = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);

    return (
        <Modal title={player.name} isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[85vh] min-w-[300px] max-w-[1100px] ">
                {/* ============ HEADER: Quality + Zone Classification ============ */}
                <div className="sticky top-0 bg-background/95 sm z-10 pb-4 border-b border-border/40 space-y-3">
                    <div></div>
                    {/* Quality Badge + Zone Badge */}
                    <div className="flex justify-between flex-wrap">
                        <div className="flex items-center">
                            <PlayerQualityIndicator overall={overallRounded} size="md" variant="badge" />
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40">
                                <span className="text-xs font-semibold text-foreground">
                                    {zoneClassification.specialistType}
                                </span>
                            </div>
                        </div>

                        {isAdmin(user?.id) && (
                            <button
                                onClick={() => setShowDetailedStats(!showDetailedStats)}
                                className="text-xs px-3 py-1.5 rounded-md bg-accent hover:bg-accent/80 transition-colors font-medium"
                            >
                                {showDetailedStats ? "Hide Numbers" : "Show Numbers"}
                            </button>
                        )}
                    </div>

                    {/* Specialist Info */}
                    <div className="space-y-2">
                        {/* Buzzwords */}
                        {buzzwords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {buzzwords.map((word, idx) => (
                                    <span
                                        key={idx}
                                        className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30"
                                    >
                                        {word}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ============ MAIN CONTENT ============ */}
                <div className="mt-4 space-y-4 pb-4 pr-4 pl-4 overflow-y-auto">
                    {/* Top Position Groups with Relative Archetype Bars */}
                    <PanelSection
                        title="Position Fit"
                        subtitle={
                            showAllPositions
                                ? "All positions with archetype scores"
                                : "Top positions shown relative to best archetype"
                        }
                        headerAction={
                            <button
                                onClick={() => setShowAllPositions(!showAllPositions)}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                            >
                                <List className="w-3 h-3 " />
                                {showAllPositions ? "Show Top Only" : "Show All"}
                            </button>
                        }
                    >
                        <div className="space-y-3 ">
                            {(showAllPositions ? allPositionGroups : topPositionGroups).map((posGroup) => {
                                // Handle both data structures
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
                                    <Panel key={position} variant="card" padding="md">
                                        {/* Position Header */}
                                        <div className="mb-3 pb-2 border-b border-border/30">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-base text-foreground">{position}</span>
                                                {showDetailedStats && bestArchetype && (
                                                    <span
                                                        className={`text-sm font-semibold ${getArchetypeTextColor(
                                                            calculateRelativeScore(bestArchetype.score, bestScore)
                                                        )}`}
                                                    >
                                                        {Math.round(bestArchetype.score)}
                                                    </span>
                                                )}
                                            </div>
                                            {archetypeData && (
                                                <span className="text-xs text-muted-foreground">
                                                    {archetypeData.strengthLabels.slice(0, 2).join(" • ")}
                                                </span>
                                            )}
                                        </div>

                                        {/* Relative Bars */}
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
                                    </Panel>
                                );
                            })}
                        </div>
                    </PanelSection>

                    {/* Admin: Detailed Stats Section */}
                    {isAdmin(user?.id) && showDetailedStats && (
                        <PanelSection title="Detailed Statistics" subtitle="Raw player attributes">
                            <Panel variant="glass" padding="md">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-accent/20 rounded-lg">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            Overall Rating:
                                        </span>
                                        <span className={`text-sm font-bold ${getStatTextColor(overallRounded)}`}>
                                            {overallRounded}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">Avg Stat:</span>
                                        <span className={`text-sm font-bold ${getStatTextColor(allStatAverage)}`}>
                                            {Math.round(allStatAverage)}
                                        </span>
                                    </div>
                                </div>

                                {/* Category Breakdown */}
                                <div className="space-y-4">
                                    {Object.entries(CategorizedStats)
                                        .filter(([category]) => category !== "morale")
                                        .map(([category, keys]) => {
                                            const avg = averages[category as StatCategory] ?? 0;
                                            const avgRounded = Math.round(avg);

                                            return (
                                                <div key={category} className="space-y-2">
                                                    {/* Category Header */}
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-sm uppercase tracking-wide text-foreground">
                                                            {category}
                                                        </h4>
                                                        <span
                                                            className={`text-sm font-bold ${getStatTextColor(avgRounded)}`}
                                                        >
                                                            {avgRounded}
                                                        </span>
                                                    </div>

                                                    {/* Category Progress Bar */}
                                                    <div className="w-full h-2 bg-muted rounded-full">
                                                        <div
                                                            className={`${getStatBarColor(avgRounded)} h-2 rounded-full`}
                                                            style={{ width: `${Math.min(avgRounded, 100)}%` }}
                                                        />
                                                    </div>

                                                    {/* Individual Stats Grid */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {keys.map((key) => {
                                                            const statValue = stats[key] ?? 0;
                                                            const statRounded = Math.round(statValue);

                                                            return (
                                                                <div
                                                                    key={key}
                                                                    className="flex justify-between items-center bg-accent/50 rounded-md p-2"
                                                                >
                                                                    <span className="text-xs font-medium text-muted-foreground">
                                                                        {statLabelMap[key]}
                                                                    </span>
                                                                    <span
                                                                        className={`text-xs font-bold ${getStatTextColor(statRounded)}`}
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
                            </Panel>
                        </PanelSection>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PlayerStatsModal;
