/**
 * Player Stats Modal (V2)
 *
 * Shows:
 * - Hexagon radar chart (6 capabilities)
 * - Player label + zone classification
 * - Zone effectiveness (Defence/Midfield/Attack)
 * - Admin-only: 11 trait breakdown
 */

import { GitCompareArrows } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import PlayerCompareModal from "@/components/players/player-compare-modal";
import RadarChart, { calculateRadarAxes } from "@/components/players/radar-chart";
import Modal from "@/components/shared/modal";
import { useAuth } from "@/context/auth-context";
import { computeLabel } from "@/lib/capabilities";
import {
    getRatingTierScheme,
    getStatBarColor,
    getStatTextColor,
    getTierBgClass,
    getTierCssVar,
} from "@/lib/color-system";
import type { Player } from "@/types/players";
import {
    CAPABILITY_KEYS,
    capabilityLabelMap,
    TRAIT_KEYS,
    traitLabelMap,
    ZONE_KEYS,
    zoneLabelMap,
} from "@/types/traits";

interface PlayerStatsModalProps {
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
}

const ADMIN_USER_ID = "24115871-04fe-4111-b048-18f7e3e976fc";
const isAdmin = (userId: string | undefined): boolean => userId === ADMIN_USER_ID;

/** Threshold above player's own trait average to count as standout */
const STANDOUT_THRESHOLD = 8;
const STANDOUT_COUNT = 4;

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, isOpen, onClose }) => {
    const { user } = useAuth();
    const [showDetailedStats, setShowDetailedStats] = useState(false);
    const [showCompare, setShowCompare] = useState(false);

    const standoutTraits = useMemo(() => {
        if (!player) return [];
        const entries = TRAIT_KEYS.map((key) => ({ key, value: player.traits[key] }));
        const avg = entries.reduce((sum, e) => sum + e.value, 0) / entries.length;
        return entries
            .filter((e) => e.value - avg >= STANDOUT_THRESHOLD)
            .sort((a, b) => b.value - a.value)
            .slice(0, STANDOUT_COUNT)
            .map((e) => traitLabelMap[e.key]);
    }, [player]);

    if (!player) return null;

    const overallRounded = Math.round(player.overall);
    const tierScheme = getRatingTierScheme(overallRounded);
    const tierBg = getTierBgClass(overallRounded);
    const tierVar = getTierCssVar(overallRounded);
    const label = computeLabel(player.traits);

    return (
        <>
            <Modal title={player.name} isOpen={isOpen} onClose={onClose}>
                <div className="flex flex-col max-h-[85vh] min-w-75 max-w-275">
                    {/* Header */}
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
                                        {label.primary}
                                        {label.secondary ? ` · ${label.secondary}` : ""}
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
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mt-3 space-y-4 pb-4 px-1 overflow-y-auto custom-scrollbar">
                        {/* Radar chart + standout traits */}
                        <div className="flex flex-col items-center gap-3">
                            <RadarChart
                                axes={calculateRadarAxes(player.capabilities)}
                                size={200}
                                tierRating={overallRounded}
                            />

                            {standoutTraits.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {standoutTraits.map((trait) => (
                                        <span
                                            key={trait}
                                            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/50 text-foreground"
                                        >
                                            {trait}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowCompare(true)}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <GitCompareArrows className="h-3.5 w-3.5" />
                                Compare
                            </button>
                        </div>

                        {/* Zone Effectiveness */}
                        <div>
                            <h3 className="text-sm font-semibold mb-2">Zone Effectiveness</h3>
                            <div className="space-y-2">
                                {ZONE_KEYS.map((zone) => {
                                    const value = Math.round(player.zoneEffectiveness[zone]);
                                    return (
                                        <div key={zone} className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-medium">{zoneLabelMap[zone]}</span>
                                                {showDetailedStats && (
                                                    <span
                                                        className={`text-xs font-bold tabular-nums ${getStatTextColor(value)}`}
                                                    >
                                                        {value}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full h-2 bg-muted rounded-full">
                                                <div
                                                    className={`${getStatBarColor(value)} h-2 rounded-full transition-all`}
                                                    style={{ width: `${Math.min(value, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Admin: Trait Capabilities and Trait Breakdown*/}
                        {isAdmin(user?.id) && showDetailedStats && (
                            <div>
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Capabilities</h3>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {CAPABILITY_KEYS.map((key) => {
                                            const value = Math.round(player.capabilities[key]);
                                            return (
                                                <div
                                                    key={key}
                                                    className="flex justify-between items-center bg-muted/30 rounded px-2 py-1.5"
                                                >
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {capabilityLabelMap[key]}
                                                    </span>
                                                    <span
                                                        className={`text-[11px] font-bold tabular-nums ${getStatTextColor(value)}`}
                                                    >
                                                        {value}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2 border-t border-border/30">
                                    <div className="flex gap-4 text-xs">
                                        <div className="flex gap-1">
                                            <span className="text-muted-foreground">Overall:</span>
                                            <span className={`font-bold ${getStatTextColor(overallRounded)}`}>
                                                {overallRounded}
                                            </span>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-xs uppercase tracking-wider">Traits</h4>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {TRAIT_KEYS.map((key) => {
                                            const value = Math.round(player.traits[key]);
                                            return (
                                                <div
                                                    key={key}
                                                    className="flex justify-between items-center bg-muted/30 rounded px-2 py-1"
                                                >
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {traitLabelMap[key]}
                                                    </span>
                                                    <span
                                                        className={`text-[11px] font-bold tabular-nums ${getStatTextColor(value)}`}
                                                    >
                                                        {value}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <PlayerCompareModal player={player} isOpen={showCompare} onClose={() => setShowCompare(false)} />
        </>
    );
};

export default PlayerStatsModal;
