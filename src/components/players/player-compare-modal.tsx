/**
 * Player Comparison Modal
 *
 * Overlays two players' radar charts and shows a side-by-side category breakdown.
 * Player A (primary) uses their tier color. Player B (compare) uses neutral gray.
 * No numeric scores shown — comparison is visual (bar widths + radar shape).
 */

import { ArrowLeft, Search } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import RadarChart, { calculateRadarAxes } from "@/components/players/radar-chart";
import Modal from "@/components/shared/modal";
import { Input } from "@/components/ui/input";
import { usePlayers } from "@/hooks/use-players";
import { getTierCssVar } from "@/lib/color-system";
import type { Player } from "@/types/players";
import { CAPABILITY_KEYS, capabilityLabelMap } from "@/types/traits";

interface PlayerCompareModalProps {
    player: Player;
    isOpen: boolean;
    onClose: () => void;
}

function usePlayerData(player: Player) {
    return useMemo(() => {
        const overall = Math.round(player.overall);
        const tierVar = getTierCssVar(overall);
        return { overall, capabilities: player.capabilities, tierVar };
    }, [player]);
}

/** Neutral color for Player B — not tied to tier */
const COMPARE_COLOR = "var(--muted-foreground)";

interface CompareViewProps {
    playerA: Player;
    playerB: Player;
    onBack: () => void;
}

const CompareView: React.FC<CompareViewProps> = ({ playerA, playerB, onBack }) => {
    const a = usePlayerData(playerA);
    const b = usePlayerData(playerB);

    const axesA = calculateRadarAxes(a.capabilities);
    const axesB = calculateRadarAxes(b.capabilities);

    return (
        <div className="flex flex-col h-[85vh] min-w-75 max-w-275">
            {/* Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                <button type="button" onClick={onBack} className="p-1 rounded hover:bg-muted/50 transition-colors">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: `var(${a.tierVar})` }}>
                        {playerA.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">vs</span>
                    <span className="text-sm font-semibold text-muted-foreground">{playerB.name}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pt-3 px-1">
                {/* Overlaid radar chart */}
                <div className="flex flex-col items-center">
                    <RadarChart
                        axes={axesA}
                        size={220}
                        tierRating={a.overall}
                        compareColor={COMPARE_COLOR}
                        compare={{ axes: axesB, tierRating: b.overall }}
                    />

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: `var(${a.tierVar})` }} />
                            <span className="text-[11px] text-muted-foreground">{playerA.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-4 h-px rounded-full bg-muted-foreground opacity-60"
                                style={{
                                    backgroundImage:
                                        "repeating-linear-gradient(90deg, var(--muted-foreground), var(--muted-foreground) 2px, transparent 2px, transparent 5px)",
                                }}
                            />
                            <span className="text-[11px] text-muted-foreground">{playerB.name}</span>
                        </div>
                    </div>
                </div>

                {/* Capability breakdown — dual bars */}
                <div className="space-y-2">
                    {CAPABILITY_KEYS.map((key) => {
                        const aVal = Math.round(playerA.capabilities[key]);
                        const bVal = Math.round(playerB.capabilities[key]);

                        return (
                            <div key={key} className="bg-card border border-border/30 rounded-lg p-3">
                                <span className="text-xs font-semibold mb-2 block">{capabilityLabelMap[key]}</span>

                                <div className="space-y-1.5">
                                    <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${Math.min(aVal, 100)}%`,
                                                backgroundColor: `var(${a.tierVar})`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-300 opacity-50"
                                            style={{
                                                width: `${Math.min(bVal, 100)}%`,
                                                backgroundColor: COMPARE_COLOR,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const PlayerCompareModal: React.FC<PlayerCompareModalProps> = ({ player, isOpen, onClose }) => {
    const { data: allPlayers = {} } = usePlayers();
    const [comparePlayer, setComparePlayer] = useState<Player | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const otherPlayers = useMemo(() => {
        return Object.values(allPlayers)
            .filter((p) => p.id !== player.id)
            .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allPlayers, player.id, searchQuery]);

    const handleClose = () => {
        setComparePlayer(null);
        setSearchQuery("");
        onClose();
    };

    const handleBack = () => {
        setComparePlayer(null);
        setSearchQuery("");
    };

    return (
        <Modal title={comparePlayer ? "" : `Compare ${player.name}`} isOpen={isOpen} onClose={handleClose}>
            {comparePlayer ? (
                <CompareView playerA={player} playerB={comparePlayer} onBack={handleBack} />
            ) : (
                <div className="flex flex-col h-[70vh] min-w-75 max-w-275 pt-2">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                            type="text"
                            placeholder="Search players..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                            autoFocus
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-1">
                        {otherPlayers.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setComparePlayer(p)}
                                className="w-full p-2.5 text-left rounded-lg border border-border/30 bg-card hover:bg-accent/50 transition-colors text-sm font-medium"
                            >
                                {p.name}
                            </button>
                        ))}
                        {otherPlayers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No players found</p>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default PlayerCompareModal;
