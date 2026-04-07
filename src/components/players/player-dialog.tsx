import { Trash2 } from "lucide-react";
import { useState } from "react";
import RadarChart, { calculateRadarAxes } from "@/components/players/radar-chart";
import Modal from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/hooks/use-players";
import { getRatingTierScheme, getTierCssVar } from "@/lib/color-system";
import { classifyPlayerByZone, getPlayStyleBuzzwords, getPrimaryArchetypeId } from "@/lib/player-quality";
import { calculateArchetypeScores, getTopPositionGroups } from "@/lib/positions/calculator";
import { getZoneAverages } from "@/lib/utils/player-scoring";
import { getArchetypeById } from "@/types/archetypes";
import type { Player, ScoredGamePlayer } from "@/types/players";
import { getTopPositions } from "@/types/players";
import type { Position } from "@/types/positions";
import { emptyZoneScores } from "@/types/positions";

const POSITION_NAMES: Record<Position, string> = {
    GK: "Goalkeeper",
    CB: "Center Back",
    FB: "Fullback",
    DM: "Defensive Mid",
    CM: "Center Mid",
    WM: "Wide Mid",
    AM: "Attacking Mid",
    ST: "Striker",
    WR: "Winger",
};

/** Number of standout traits to show */
const STANDOUT_COUNT = 3;
/** A stat must be this many points above the player's own average to count as standout */
const STANDOUT_THRESHOLD = 8;

interface OverviewTabProps {
    player: ScoredGamePlayer;
    fullPlayer: Player | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ player, fullPlayer }) => {
    if (!fullPlayer) {
        return (
            <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">No stats available for guest players</p>
            </div>
        );
    }

    const stats = fullPlayer.stats;
    const archetypeScores = calculateArchetypeScores(stats);
    const topScores = getTopPositions(archetypeScores, 3);
    const overall = Math.max(...topScores.map((t) => t.score));
    const overallRounded = Math.round(overall);
    const averages = getZoneAverages(fullPlayer);
    const tierVar = getTierCssVar(overallRounded);

    // Standout traits
    const entries = Object.entries(stats) as [string, number][];
    const avg = entries.reduce((sum, [_, v]) => sum + v, 0) / (entries.length || 1);
    const standoutTraits = entries
        .filter(([_, v]) => v - avg >= STANDOUT_THRESHOLD)
        .sort((a, b) => b[1] - a[1])
        .slice(0, STANDOUT_COUNT);

    // Buzzwords
    const primaryArchetypeId = getPrimaryArchetypeId(archetypeScores);
    const buzzwords = primaryArchetypeId ? getPlayStyleBuzzwords(primaryArchetypeId) : [];

    // Zone classification
    const zoneScores = structuredClone(emptyZoneScores);
    for (const position in archetypeScores) {
        zoneScores[position as Position] = archetypeScores[position].bestScore;
    }
    const zoneClassification = classifyPlayerByZone(zoneScores);

    // Position fit
    const topPositionGroups = getTopPositionGroups(archetypeScores);
    const globalBest = topPositionGroups.length ? Math.max(...topPositionGroups[0].archetypes.map((a) => a.score)) : 1;

    // Tier scheme
    const tierScheme = getRatingTierScheme(overallRounded);

    return (
        <div className="space-y-3 px-1 py-2 overflow-y-auto custom-scrollbar">
            {/* Tier + zone */}
            <div className="flex items-center gap-2">
                <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                        color: `var(${tierVar})`,
                        backgroundColor: `color-mix(in oklch, var(${tierVar}), transparent 85%)`,
                    }}
                >
                    {tierScheme.label}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                    {zoneClassification.specialistType}
                </span>
            </div>

            {/* Buzzwords */}
            {buzzwords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {buzzwords.map((word) => (
                        <span
                            key={word}
                            className="text-[11px] px-1.5 py-0.5 rounded-full border border-border/40 bg-muted/40 text-foreground"
                        >
                            {word}
                        </span>
                    ))}
                </div>
            )}

            {/* Radar chart */}
            <div className="flex flex-col items-center gap-2">
                <RadarChart axes={calculateRadarAxes(averages)} size={160} tierRating={overallRounded} />

                {/* Standout traits */}
                {standoutTraits.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                        {standoutTraits.map(([key]) => {
                            const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                            return (
                                <span
                                    key={key}
                                    className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-muted/50 text-foreground"
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current position fit */}
            {(() => {
                const currentPos = player.exactPosition;
                let currentGroup = topPositionGroups.find((g) => g.position === currentPos);

                // If the current position isn't in top groups, build it from raw archetype scores
                if (!currentGroup && archetypeScores[currentPos]) {
                    const posData = archetypeScores[currentPos];
                    const archetypeEntries = Object.entries(posData.archetypes).map(([archetypeId, score]) => ({
                        archetypeId,
                        score,
                        isBest: archetypeId === posData.bestArchetypeId,
                    }));
                    currentGroup = { position: currentPos, archetypes: archetypeEntries };
                }

                const otherGroups = topPositionGroups.filter((g) => g.position !== currentPos).slice(0, 3);

                const renderPositionCard = (posGroup: (typeof topPositionGroups)[0]) => {
                    const sortedArchetypes = [...posGroup.archetypes].sort((a, b) => b.score - a.score).slice(0, 2);
                    const topScore = sortedArchetypes[0]?.score ?? 0;
                    const pct = Math.round((topScore / globalBest) * 100);

                    // Radial ring SVG params
                    const ringSize = 36;
                    const strokeW = 3;
                    const radius = (ringSize - strokeW) / 2;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference * (1 - pct / 100);

                    return (
                        <div key={posGroup.position} className="bg-card border border-border/30 rounded-lg p-3">
                            <div className="flex items-center gap-2.5">
                                {/* Radial progress ring */}
                                <div className="shrink-0 relative" style={{ width: ringSize, height: ringSize }}>
                                    <svg width={ringSize} height={ringSize} className="-rotate-90" aria-hidden="true">
                                        <circle
                                            cx={ringSize / 2}
                                            cy={ringSize / 2}
                                            r={radius}
                                            fill="none"
                                            stroke="var(--border)"
                                            strokeOpacity={0.4}
                                            strokeWidth={strokeW}
                                        />
                                        <circle
                                            cx={ringSize / 2}
                                            cy={ringSize / 2}
                                            r={radius}
                                            fill="none"
                                            stroke="var(--muted-foreground)"
                                            strokeOpacity={0.7}
                                            strokeWidth={strokeW}
                                            strokeDasharray={circumference}
                                            strokeDashoffset={offset}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-muted-foreground tabular-nums">
                                        {pct}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <span className="font-bold text-xs">{posGroup.position}</span>
                                    <span className="text-[11px] text-muted-foreground ml-1.5">
                                        {sortedArchetypes
                                            .map((a) => getArchetypeById(a.archetypeId)?.name)
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                };

                return (
                    <>
                        {currentGroup && (
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-semibold">Current Position Fit</h3>
                                {renderPositionCard(currentGroup)}
                            </div>
                        )}
                        {otherGroups.length > 0 && (
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-semibold text-muted-foreground">Other Top Fits</h3>
                                {otherGroups.map(renderPositionCard)}
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
};

interface SwapTabProps {
    player: ScoredGamePlayer;
    players: Record<string, Player>;
    onClose: () => void;
}

const SwapTab: React.FC<SwapTabProps> = ({ player, players, onClose }) => {
    const { gamePlayers, switchToRealPlayer } = useGame();
    const [searchTerm, setSearchTerm] = useState("");

    const availablePlayers = Object.values(players)
        .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSwapPlayer = (newPlayer: Player) => {
        const isInGame = newPlayer.id in gamePlayers;
        if (isInGame) {
            if (window.confirm(`${newPlayer.name} is already in the game. Swap positions?`)) {
                switchToRealPlayer(player, newPlayer.id);
                onClose();
            }
        } else {
            switchToRealPlayer(player, newPlayer.id);
            onClose();
        }
    };

    return (
        <div className="flex flex-col h-full space-y-2 px-1 py-2">
            <Input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scrollbar">
                {availablePlayers.map((p) => {
                    const isInGame = p.id in gamePlayers;
                    return (
                        <button
                            type="button"
                            key={p.id}
                            onClick={() => handleSwapPlayer(p)}
                            className={`w-full p-2.5 text-left rounded-lg border transition-colors text-sm ${
                                isInGame
                                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                                    : "bg-card hover:bg-accent/50 border-border/30"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{p.name}</span>
                                {isInGame && <span className="text-[11px]">In game</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface PlayerDialogProps {
    player: ScoredGamePlayer;
    isOpen: boolean;
    onClose: () => void;
}

const PitchPlayerDialog: React.FC<PlayerDialogProps> = ({ player, isOpen, onClose }) => {
    const { data: players = {} } = usePlayers();
    const { removeFromGame, currentFormation } = useGame();

    const fullPlayer = player.id ? players[player.id] : null;
    const playerName = fullPlayer?.name || player.name;

    const handleRemove = () => {
        if (window.confirm(`Remove ${playerName} from the game?`)) {
            removeFromGame(player);
            onClose();
        }
    };

    return (
        <Modal title="" isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[85vh] max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                            player.team === "A"
                                ? "bg-cyan-400 border-cyan-300/60 text-white"
                                : "bg-lime-400 border-lime-300/60 text-gray-900"
                        }`}
                        style={{
                            boxShadow:
                                player.team === "A"
                                    ? "0 0 10px 2px hsl(200 80% 60%/0.2)"
                                    : "0 0 10px 2px hsl(84 70% 55%/0.2)",
                        }}
                    >
                        {fullPlayer?.avatar_url ? (
                            <img
                                src={fullPlayer.avatar_url}
                                alt={playerName}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <span className="text-sm font-bold">{player.exactPosition}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold truncate">{playerName}</h2>
                        <p className="text-[11px] text-muted-foreground">
                            {POSITION_NAMES[player.exactPosition]} · Team {player.team}
                            {currentFormation && ` · ${currentFormation.name}`}
                        </p>
                    </div>
                </div>

                {/* Guest: swap only */}
                {player.isGuest && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <SwapTab player={player} players={players} onClose={onClose} />
                    </div>
                )}

                {/* Non-guest: tabs */}
                {!player.isGuest && (
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-2 mt-2">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="swap">Swap</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="flex-1 overflow-y-auto">
                            <OverviewTab player={player} fullPlayer={fullPlayer} />
                        </TabsContent>

                        <TabsContent value="swap" className="flex-1 flex flex-col overflow-hidden">
                            <SwapTab player={player} players={players} onClose={onClose} />
                        </TabsContent>
                    </Tabs>
                )}

                {/* Remove button */}
                <div className="pt-3 border-t border-border/30">
                    <Button
                        onClick={handleRemove}
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        disabled={player.isGuest}
                    >
                        <Trash2 size={14} className="mr-1.5" />
                        Remove from Game
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PitchPlayerDialog;
