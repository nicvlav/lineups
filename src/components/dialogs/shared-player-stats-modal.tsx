import React from "react";
import { StatCategory, StatsKey, statLabelMap, CategorizedStats } from "@/data/stat-types";
import { ZoneAverages, Player } from "@/data/player-types";
import { ZoneScores } from "@/data/position-types";
import { PositionScoreList } from "@/components/dialogs/position-score-list";
import Modal from "@/components/dialogs/modal";

interface SharedPlayerStatsModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    overall: number;
    zoneFit: ZoneScores;
    top3Positions: string;
    averages: ZoneAverages;
    stats: Record<StatsKey, number>;
}

// Simple modern coloring system for stats popup
export const getStatColor = (value: number) => {
    if (value >= 75) return "text-emerald-500"; // Good (green)
    if (value >= 50) return "text-amber-500"; // Average (yellow/amber)
    return "text-red-500"; // Poor (red)
};

export const getBarColor = (value: number) => {
    if (value >= 75) return "bg-emerald-500"; // Good (green)
    if (value >= 50) return "bg-amber-500"; // Average (yellow/amber)
    return "bg-red-500"; // Poor (red)
};

// Modern minimal card accent system for player cards
export const getPlayerAccent = (rating: number) => {
    if (rating >= 85) return { 
        border: 'border-l-4 border-l-emerald-400/70 border-r border-t border-b border-border/40', 
        badge: 'bg-emerald-500 border-emerald-400' 
    }; // Excellent (85+)
    if (rating >= 75) return { 
        border: 'border-l-4 border-l-blue-400/70 border-r border-t border-b border-border/40', 
        badge: 'bg-blue-500 border-blue-400' 
    }; // Good (75-85)
    if (rating >= 65) return { 
        border: 'border-l-4 border-l-amber-400/70 border-r border-t border-b border-border/40', 
        badge: 'bg-amber-500 border-amber-400' 
    }; // Average (65-75)
    if (rating >= 50) return { 
        border: 'border-l-4 border-l-orange-400/70 border-r border-t border-b border-border/40', 
        badge: 'bg-orange-500 border-orange-400' 
    }; // Below average (50-65)
    return { 
        border: 'border border-border/30', 
        badge: 'bg-slate-500 border-slate-400' 
    }; // Poor (<50)
};

const SharedPlayerStatsModal: React.FC<SharedPlayerStatsModalProps> = ({
    player,
    isOpen,
    onClose,
    overall,
    zoneFit,
    top3Positions,
    averages,
    stats,
}) => {
    if (!player) return null;

    // Collect all morale stat keys
    const moraleKeys = CategorizedStats.morale;

    // Get only non-morale values
    const nonMoraleValues = Object.entries(stats)
        .filter(([key]) => !moraleKeys.includes(key as StatsKey))
        .map(([_, value]) => value);

    const allStatAverage = nonMoraleValues.reduce((sum, v) => sum + v, 0) /
        (nonMoraleValues.length || 1);

    const overallRounded = Math.round(overall); // Round to whole number

    return (
        <Modal title={player.name} isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[80vh] min-w-[200px] max-w-[1000px]">
                <div className="grid grid-cols-[auto_max-content_auto] gap-x-2 p-1 text-sm sm:text-base font-bold tracking-wide">
                    <span>OVERALL:</span>
                    <span className={`${getStatColor(overallRounded)}`}>{overallRounded}</span>
                    <span>[{top3Positions}]</span>

                    <span>AVERAGE:</span>
                    <span className={`${getStatColor(allStatAverage)}`}>{Math.round(allStatAverage)}</span>
                    <span>[ALL STATS]</span>
                </div>
                <div>
                    {Object.entries(CategorizedStats)
                        .filter(([category]) => category !== "morale")
                        .map(([category, keys]) => {
                            const avg = averages[category as StatCategory] ?? 0;
                            const avgRounded = Math.round(avg); // Round to whole number

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
                                            const statRounded = Math.round(statValue); // Round to whole number
                                            
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

                <div className="mt-4 p-1 text-sm sm:text-base font-bold tracking-wide">
                    <span>ALL POSITIONS:</span>
                </div>

                <div className="h-[200px]">
                    <PositionScoreList zoneFit={zoneFit} />
                </div>
            </div>
        </Modal>
    );
};

export default SharedPlayerStatsModal;