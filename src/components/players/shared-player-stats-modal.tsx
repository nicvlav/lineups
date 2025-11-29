import React, { useState } from "react";
import { StatCategory, StatsKey, statLabelMap, CategorizedStats } from "@/types/stats";
import { ZoneAverages, Player, PlayerArchetypeScores } from "@/types/players";
import { ZoneScores, Position } from "@/types/positions";
import { getArchetypeById } from "@/types/archetypes";
import { getAllPositionArchetypeGroups } from "@/lib/positions/calculator";
import Modal from "@/components/shared/modal";
import { useAuth } from "@/context/auth-context";
import { getStatBarColor, getStatTextColor } from "@/lib/color-system";

interface SharedPlayerStatsModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    overall: number;
    zoneFit: ZoneScores;
    top3Positions: string;
    topScoresWithArchetypes: Array<{ position: Position; score: number; archetypeId: string }>;
    archetypeScores: PlayerArchetypeScores;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>;
}

// Color functions now imported from unified color system
// Legacy exports maintained for backwards compatibility
export const getStatColor = getStatTextColor;
export const getBarColor = getStatBarColor;

// Modern minimal card accent system for player cards
export const getPlayerAccent = (rating: number) => {
    if (rating >= 90) return {
        border: 'border-l-4 border-l-emerald-400/70 border-r border-t border-b border-border/40',
        badge: 'bg-emerald-500 border-emerald-400'
    }; // Elite (90+)
    if (rating >= 80) return {
        border: 'border-l-4 border-l-blue-400/70 border-r border-t border-b border-border/40',
        badge: 'bg-blue-500 border-blue-400'
    }; // Excellent (80-90)
    if (rating >= 70) return {
        border: 'border-l-4 border-l-amber-400/70 border-r border-t border-b border-border/40',
        badge: 'bg-amber-500 border-amber-400'
    }; // Good (70-80)
    if (rating >= 60) return {
        border: 'border-l-4 border-l-orange-400/70 border-r border-t border-b border-border/40',
        badge: 'bg-orange-500 border-orange-400'
    }; // Average (60-70)
    if (rating >= 40) return {
        border: 'border-l-4 border-l-red-400/70 border-r border-t border-b border-border/40',
        badge: 'bg-red-500 border-red-400'
    }; // Below average (40-60)
    return {
        border: 'border border-border/30',
        badge: 'bg-slate-500 border-slate-400'
    }; // Poor (<40)
};

// Check if user should see the Numbers button (admin only)
const ADMIN_USER_ID = "24115871-04fe-4111-b048-18f7e3e976fc"; // Your user ID
const isAdmin = (userId: string | undefined): boolean => {
    if (!userId) return false;
    return userId === ADMIN_USER_ID;
};

const SharedPlayerStatsModal: React.FC<SharedPlayerStatsModalProps> = ({
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

    if (!player) return null;

    const showNumbers = isAdmin(user?.id) && showDetailedStats;
    const overallRounded = Math.round(overall);

    // Get all positions for expanded view
    const allPositionGroups = getAllPositionArchetypeGroups(archetypeScores);

    // Get values for detailed stats
    const values = Object.entries(stats).map(([_, value]) => value);
    const allStatAverage = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);

    return (
        <Modal title={player.name} isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[80vh] min-w-[200px] max-w-[1000px] overflow-y-auto">
                {/* Clean Header with Only Progress Bar */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">OVERALL</span>
                            <div className="flex-1 max-w-xs">
                                <div className="w-full h-3 bg-muted rounded-full">
                                    <div
                                        className={`${getBarColor(overallRounded)} h-3 rounded-full transition-all`}
                                        style={{ width: `${Math.min(overallRounded, 100)}%` }}
                                    />
                                </div>
                            </div>
                            {showNumbers && (
                                <span className={`text-xl font-bold ${getStatColor(overallRounded)}`}>
                                    {overallRounded}
                                </span>
                            )}
                        </div>

                        {isAdmin(user?.id) && (
                            <button
                                onClick={() => setShowDetailedStats(!showDetailedStats)}
                                className="text-xs ml-3 px-2 py-1 rounded bg-accent hover:bg-accent/80 transition-colors"
                            >
                                Numbers
                            </button>
                        )}
                    </div>
                </div>


                {/* Expanded View - Clean All Positions */}
                <div className="mt-4 space-y-3 pb-4">
                    <h3 className="font-bold text-base tracking-wide text-muted-foreground">ALL POSITIONS</h3>

                    {allPositionGroups.map(({ position, bestScore, bestArchetypeId, allArchetypes }) => {
                        const bestArchetype = getArchetypeById(bestArchetypeId);
                        if (!bestArchetype) return null;

                        return (
                            <div key={position} className="bg-background border border-border/30 rounded-lg p-3">
                                {/* Position Header with Bar */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-base text-primary">{position}</span>
                                        {showNumbers && (
                                            <span className={`text-sm font-semibold ${getStatColor(bestScore)}`}>
                                                {Math.round(bestScore)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full">
                                        <div
                                            className={`${getBarColor(bestScore)} h-2 rounded-full transition-all`}
                                            style={{ width: `${Math.min(bestScore, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* All Archetypes - No Buzzwords, Just Clean Bars */}
                                <div className="space-y-1.5">
                                    {allArchetypes.map(({ archetypeId, score }) => {
                                        const archetype = getArchetypeById(archetypeId);
                                        if (!archetype) return null;

                                        const isPrimary = archetypeId === bestArchetypeId;

                                        return (
                                            <div key={archetypeId} className="flex items-center gap-2">
                                                <div className="flex-1 flex items-center gap-2">
                                                    {isPrimary && (
                                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/15 text-primary">
                                                            1ST
                                                        </span>
                                                    )}
                                                    <span className={`text-xs ${isPrimary ? 'font-semibold' : 'font-normal text-muted-foreground'}`}>
                                                        {archetype.name}
                                                    </span>
                                                </div>
                                                <div className="flex-1 max-w-[200px] flex items-center gap-2">
                                                    <div className="flex-1 h-1 bg-muted rounded-full">
                                                        <div
                                                            className={`${getBarColor(score)} h-1 rounded-full transition-all`}
                                                            style={{ width: `${Math.min(score, 100)}%` }}
                                                        />
                                                    </div>
                                                    {showNumbers && (
                                                        <span className={`text-xs font-semibold w-8 text-right ${getStatColor(score)}`}>
                                                            {Math.round(score)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detailed Stats - Only for Admin when enabled */}
                {isAdmin(user?.id) && showDetailedStats && (
                    <div className="mt-6 pt-6 border-t border-border/40">
                        <h3 className="font-bold text-base tracking-wide mb-3 text-muted-foreground">RAW STATISTICS</h3>

                        <div className="grid grid-cols-[auto_max-content] gap-x-4 gap-y-1 p-3 bg-accent/20 rounded-lg text-sm mb-4">
                            <span className="font-medium">Overall Rating:</span>
                            <span className={`font-bold ${getStatColor(overallRounded)}`}>{overallRounded}</span>

                            <span className="font-medium">Average Stat:</span>
                            <span className={`font-bold ${getStatColor(allStatAverage)}`}>
                                {Math.round(allStatAverage)}
                            </span>
                        </div>

                        <div>
                            {Object.entries(CategorizedStats)
                                .filter(([category]) => category !== "morale")
                                .map(([category, keys]) => {
                                    const avg = averages[category as StatCategory] ?? 0;
                                    const avgRounded = Math.round(avg);

                                    return (
                                        <div className="mt-4 p-1" key={category}>
                                            <h3 className="font-bold text-sm sm:text-base tracking-wide mb-1">
                                                {category.toUpperCase()} (
                                                <span className={`text-sm font-bold ${getStatColor(avgRounded)}`}>
                                                    {avgRounded}
                                                </span>
                                                <span className="font-bold text-sm sm:text-base tracking-wide mb-1">)</span>
                                            </h3>

                                            {/* Progress bar */}
                                            <div className="w-full h-2 bg-gray-300 rounded mb-2">
                                                <div
                                                    className={`${getBarColor(avgRounded)} h-2 rounded`}
                                                    style={{ width: `${Math.min(avgRounded, 100)}%` }}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 pb-2">
                                                {keys.map((key) => {
                                                    const statValue = stats[key] ?? 0;
                                                    const statRounded = Math.round(statValue);

                                                    return (
                                                        <div
                                                            key={key}
                                                            className="flex justify-between items-center bg-accent rounded-lg p-2"
                                                        >
                                                            <span className="text-sm font-medium p-1">{statLabelMap[key]}</span>
                                                            <span className={`text-sm font-bold ${getStatColor(statRounded)}`}>
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
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SharedPlayerStatsModal;
