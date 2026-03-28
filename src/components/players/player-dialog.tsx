import { Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import Modal from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/hooks/use-players";
import { getArchetypeBarColor } from "@/lib/color-system";
import { calculateScoresForStats } from "@/lib/utils/player-scoring";
import { applyVisualScaling, calculateAllRelativeScores } from "@/lib/utils/relative-scoring";
import type { Player, ScoredGamePlayer, ZoneScores } from "@/types/players";
import type { Position } from "@/types/positions";

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

interface OverviewTabComponentProps {
    player: ScoredGamePlayer;
    fullPlayer: Player | null;
}

const OverviewTabComponent: React.FC<OverviewTabComponentProps> = ({ player, fullPlayer }) => {
    const zoneFit = useMemo((): ZoneScores => {
        const hasData = Object.values(player.zoneFit).some((score) => score > 0);
        if (hasData) return player.zoneFit;
        if (fullPlayer?.stats) return calculateScoresForStats(fullPlayer.stats);
        return player.zoneFit;
    }, [player.zoneFit, fullPlayer]);

    const relativeScores = useMemo(() => calculateAllRelativeScores(zoneFit), [zoneFit]);

    const getAlternativePositions = () => {
        return Object.entries(relativeScores)
            .filter(([pos]) => pos !== player.exactPosition && pos !== "GK")
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
    };

    const currentPositionFit = relativeScores[player.exactPosition];

    return (
        <div className="space-y-3 p-3">
            {/* Current position */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold">Current Position</span>
                </div>
                <div className="bg-card border border-border/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium">{POSITION_NAMES[player.exactPosition]}</span>
                        <span className="text-xs font-bold tabular-nums">{currentPositionFit.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full">
                        <div
                            className={`h-1.5 rounded-full transition-all ${getArchetypeBarColor(currentPositionFit)}`}
                            style={{ width: `${applyVisualScaling(currentPositionFit)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Alternatives */}
            {!player.isGuest && (
                <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Alternatives</span>
                    <div className="space-y-1.5">
                        {getAlternativePositions().map(([position, score]) => (
                            <div key={position} className="bg-card border border-border/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {POSITION_NAMES[position as Position]}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{position}</span>
                                    </div>
                                    <span className="text-xs font-bold tabular-nums">{score.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full">
                                    <div
                                        className={`h-1.5 rounded-full ${getArchetypeBarColor(score)}`}
                                        style={{ width: `${applyVisualScaling(score)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface SwapTabComponentProps {
    player: ScoredGamePlayer;
    players: Record<string, Player>;
    onClose: () => void;
}

const SwapTabComponent: React.FC<SwapTabComponentProps> = ({ player, players, onClose }) => {
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
        <div className="flex flex-col h-full space-y-2 p-3">
            <Input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
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
                                    : "bg-card hover:bg-muted border-border/30"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{p.name}</span>
                                {isInGame && <span className="text-[10px]">In game</span>}
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

    const teamColor = player.team === "A" ? "bg-cyan-500" : "bg-lime-500";

    return (
        <Modal title="" isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[85vh] max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b border-border/30">
                    <div className="relative">
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${teamColor}`}
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
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold truncate">{playerName}</h2>
                        <p className="text-xs text-muted-foreground">
                            {POSITION_NAMES[player.exactPosition]} · Team {player.team}
                            {currentFormation && ` · ${currentFormation.name}`}
                        </p>
                    </div>
                </div>

                {/* Guest: swap only */}
                {player.isGuest && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <SwapTabComponent player={player} players={players} onClose={onClose} />
                    </div>
                )}

                {/* Non-guest: tabs */}
                {!player.isGuest && (
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-2 mx-3 mt-2" style={{ width: "calc(100% - 24px)" }}>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="swap">Swap</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="flex-1 overflow-y-auto">
                            <OverviewTabComponent player={player} fullPlayer={fullPlayer} />
                        </TabsContent>

                        <TabsContent value="swap" className="flex-1 flex flex-col overflow-hidden">
                            <SwapTabComponent player={player} players={players} onClose={onClose} />
                        </TabsContent>
                    </Tabs>
                )}

                {/* Remove button */}
                <div className="p-3 border-t border-border/30">
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
