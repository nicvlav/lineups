import { Trash2, TrendingUp, User } from "lucide-react";
import { useMemo, useState } from "react";
import Modal from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/context/players-provider";
import { getArchetypeBarColor } from "@/lib/color-system";
import { calculateScoresForStats } from "@/lib/utils/player-scoring";
import { applyVisualScaling, calculateAllRelativeScores } from "@/lib/utils/relative-scoring";
import { Player, ScoredGamePlayer, ZoneScores } from "@/types/players";
import { Position } from "@/types/positions";

const POSITION_NAMES: Record<Position, string> = {
    GK: "Goalkeeper",
    CB: "Center Back",
    FB: "Fullback",
    DM: "Defensive Midfielder",
    CM: "Center Midfielder",
    WM: "Wide Midfielder",
    AM: "Attacking Midfielder",
    ST: "Striker",
    WR: "Winger",
};

interface OverviewTabComponentProps {
    player: ScoredGamePlayer;
    fullPlayer: Player | null;
}

const OverviewTabComponent: React.FC<OverviewTabComponentProps> = ({ player, fullPlayer }) => {
    // Calculate zoneFit if not present (for manually swapped players)
    const zoneFit = useMemo((): ZoneScores => {
        // Check if zoneFit has meaningful data (not all zeros)
        const hasData = Object.values(player.zoneFit).some((score) => score > 0);

        if (hasData) {
            return player.zoneFit;
        }

        // Calculate zoneFit from player stats if available
        if (fullPlayer?.stats) {
            return calculateScoresForStats(fullPlayer.stats);
        }

        // Fallback: return empty scores
        return player.zoneFit;
    }, [player.zoneFit, fullPlayer]);

    // Calculate relative scores using unified system
    const relativeScores = useMemo(() => {
        return calculateAllRelativeScores(zoneFit);
    }, [zoneFit]);

    // Get top 3 alternative positions (using relative scores)
    const getAlternativePositions = () => {
        const alternatives = Object.entries(relativeScores)
            .filter(([pos]) => pos !== player.exactPosition && pos != "GK")
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .slice(0, 3);

        return alternatives;
    };

    const currentPositionFit = relativeScores[player.exactPosition];

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
            {/* Position Fit Card */}
            <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Position Fit
                </h3>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            Current Position ({POSITION_NAMES[player.exactPosition]}){" "}
                        </span>
                        <span className="text-sm font-bold">{currentPositionFit.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-al ${getArchetypeBarColor(currentPositionFit)}`}
                            style={{ width: `${applyVisualScaling(currentPositionFit)}%` }}
                        />
                    </div>
                </div>
            </div>
            {/* Alternate Positions */}
            {!player.isGuest && (
                <div>
                    <p className="text-sm text-muted-foreground mb-4">Alternative strong positions for this player:</p>
                    {getAlternativePositions().map(([position, score]) => (
                        <div key={position} className="bg-card border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-semibold">{POSITION_NAMES[position as Position]}</h4>
                                    <p className="text-xs text-muted-foreground">{position}</p>
                                </div>
                                <span className="text-sm font-bold">{score.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${getArchetypeBarColor(score)}`}
                                    style={{ width: `${applyVisualScaling(score)}%` }}
                                />
                            </div>
                        </div>
                    ))}
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

    // Filter available players for swapping
    const availablePlayers = Object.values(players)
        .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSwapPlayer = (newPlayer: Player) => {
        const isInGame = newPlayer.id in gamePlayers;

        if (isInGame) {
            // Confirm swap if player is already in game
            if (window.confirm(`${newPlayer.name} is already in the game. Swap positions?`)) {
                switchToRealPlayer(player, newPlayer.id);
                onClose();
            }
        } else {
            // Direct swap if not in game
            switchToRealPlayer(player, newPlayer.id);
            onClose();
        }
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-4">
            <div className="p-4 border-b">
                <input
                    type="text"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <div className="space-y-1">
                    {availablePlayers.map((p) => {
                        const isInGame = p.id in gamePlayers;
                        return (
                            <button
                                key={p.id}
                                onClick={() => handleSwapPlayer(p)}
                                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                                    isInGame
                                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                                        : "bg-card hover:bg-muted"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{p.name}</span>
                                    {isInGame && <span className="text-xs text-red-500">In game</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
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
    const { players } = usePlayers();
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
                {/* Player Header */}
                <div className="flex items-center gap-4 p-4 border-b bg-linear-to-r from-background to-muted/20">
                    <div className="relative">
                        <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${
                                player.team === "A" ? "bg-cyan-500" : "bg-lime-500"
                            }`}
                        >
                            {fullPlayer?.avatar_url ? (
                                <img
                                    src={fullPlayer.avatar_url}
                                    alt={playerName}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <User size={32} />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-background border rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                            {player.exactPosition}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-foreground truncate">{playerName}</h2>
                        <p className="text-sm text-muted-foreground">
                            {POSITION_NAMES[player.exactPosition]} • Team {player.team}
                        </p>
                        {currentFormation && (
                            <p className="text-xs text-muted-foreground">Formation: {currentFormation.name}</p>
                        )}
                    </div>
                </div>

                {/* Guest only shows swap screen */}
                {player.isGuest && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <SwapTabComponent player={player} players={players} onClose={onClose} />
                    </div>
                )}

                {/* Non Guest shows overview */}
                {!player.isGuest && (
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="swap">Swap</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4">
                            <OverviewTabComponent player={player} fullPlayer={fullPlayer} />
                        </TabsContent>

                        <TabsContent value="swap" className="flex-1 flex flex-col overflow-hidden">
                            <SwapTabComponent player={player} players={players} onClose={onClose} />
                        </TabsContent>
                    </Tabs>
                )}

                {/* Action Buttons - Always Visible */}
                <div className="p-4 border-t bg-background space-y-2">
                    <Button onClick={handleRemove} variant="destructive" className="w-full" disabled={player.isGuest}>
                        <Trash2 size={16} className="mr-2" />
                        Remove from Game
                    </Button>
                    <Button onClick={onClose} variant="outline" className="w-full">
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PitchPlayerDialog;
