import { Trash2 } from "lucide-react";
import { useState } from "react";
import RadarChart, { calculateRadarAxes } from "@/components/players/radar-chart";
import Modal from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GamePlayer } from "@/context/game-provider";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/hooks/use-players";
import { computeLabel } from "@/lib/capabilities";
import { getRatingTierScheme, getStatBarColor, getTierCssVar } from "@/lib/color-system";
import type { Player } from "@/types/players";
import type { Position } from "@/types/positions";
import { TRAIT_KEYS, traitLabelMap, ZONE_KEYS, zoneLabelMap } from "@/types/traits";

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
    player: GamePlayer;
    fullPlayer: Player | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ fullPlayer }) => {
    if (!fullPlayer) {
        return (
            <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">No stats available for guest players</p>
            </div>
        );
    }

    const overallRounded = Math.round(fullPlayer.overall);
    const tierVar = getTierCssVar(overallRounded);
    const label = computeLabel(fullPlayer.traits);
    const tierScheme = getRatingTierScheme(overallRounded);

    // Standout traits
    const traitEntries = TRAIT_KEYS.map((key) => ({ key, value: fullPlayer.traits[key] }));
    const avg = traitEntries.reduce((sum, e) => sum + e.value, 0) / traitEntries.length;
    const standoutTraits = traitEntries
        .filter((e) => e.value - avg >= STANDOUT_THRESHOLD)
        .sort((a, b) => b.value - a.value)
        .slice(0, STANDOUT_COUNT);

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
                    {label.primary}
                    {label.secondary ? ` · ${label.secondary}` : ""}
                </span>
            </div>

            {/* Radar chart */}
            <div className="flex flex-col items-center gap-2">
                <RadarChart axes={calculateRadarAxes(fullPlayer.capabilities)} size={160} tierRating={overallRounded} />

                {/* Standout traits */}
                {standoutTraits.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                        {standoutTraits.map((entry) => (
                            <span
                                key={entry.key}
                                className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-muted/50 text-foreground"
                            >
                                {traitLabelMap[entry.key]}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Zone Effectiveness */}
            <div className="space-y-1.5">
                <h3 className="text-xs font-semibold">Zone Effectiveness</h3>
                {ZONE_KEYS.map((zone) => {
                    const value = Math.round(fullPlayer.zoneEffectiveness[zone]);
                    return (
                        <div key={zone} className="bg-card border border-border/30 rounded-lg p-2.5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium">{zoneLabelMap[zone]}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full">
                                <div
                                    className={`${getStatBarColor(value)} h-1.5 rounded-full`}
                                    style={{ width: `${Math.min(value, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface SwapTabProps {
    player: GamePlayer;
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
    player: GamePlayer;
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
                        {fullPlayer?.avatarUrl ? (
                            <img
                                src={fullPlayer.avatarUrl}
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
