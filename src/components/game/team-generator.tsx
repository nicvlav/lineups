import { motion } from "framer-motion";
import { CheckCircle2, Minus, Plus, Users, UserX, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/auto-balance";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/hooks/use-players";
import { cn } from "@/lib/utils";

// ─── Placeholder localStorage persistence ───────────────────────────────────

const DRAFT_STORAGE_KEY = "lineups.generateDraft";

function loadDraftPlaceholderCount(): number {
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return 0;
        const parsed = JSON.parse(raw);
        return typeof parsed.placeholderCount === "number" ? parsed.placeholderCount : 0;
    } catch {
        return 0;
    }
}

function saveDraftPlaceholderCount(count: number) {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ placeholderCount: count }));
}

export function clearDraftPlaceholders() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TeamGeneratorProps {
    isCompact: boolean;
}

const TeamGenerator: React.FC<TeamGeneratorProps> = () => {
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [placeholderCount, setPlaceholderCount] = useState(0);
    const { data: players = {} } = usePlayers();
    const { gamePlayers, generateTeams } = useGame();
    const navigate = useNavigate();

    const playersArr = Object.values(players);
    const sortedPlayers = useMemo(() => {
        const filtered = searchQuery
            ? playersArr.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : playersArr;
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }, [playersArr, searchQuery]);

    // Initialize from gamePlayers (if returning to tab) or localStorage draft
    useEffect(() => {
        const realIds = Object.keys(players).filter((id) => id in gamePlayers);
        setSelectedPlayers(realIds);

        // Derive placeholder count: guests in gamePlayers take priority,
        // otherwise always restore from localStorage draft.
        const guestCount = Object.values(gamePlayers).filter((p) => p.isGuest).length;
        if (guestCount > 0) {
            setPlaceholderCount(guestCount);
            saveDraftPlaceholderCount(guestCount);
        } else {
            setPlaceholderCount(loadDraftPlaceholderCount());
        }
    }, [players, gamePlayers]);

    // Persist placeholder count changes
    const updatePlaceholderCount = (count: number) => {
        const clamped = Math.max(0, count);
        setPlaceholderCount(clamped);
        saveDraftPlaceholderCount(clamped);
    };

    const totalSelected = selectedPlayers.length + placeholderCount;
    const canGenerate = totalSelected >= MIN_PLAYERS && totalSelected <= MAX_PLAYERS;
    const allSelected = selectedPlayers.length === playersArr.length;

    const handleGenerateTeams = async () => {
        if (!canGenerate) return;

        const selectedPlayerObjects = playersArr.filter((player) => selectedPlayers.includes(player.id));

        generateTeams(selectedPlayerObjects, placeholderCount);

        const desc =
            placeholderCount > 0
                ? `${selectedPlayers.length} players + ${placeholderCount} placeholders`
                : `${selectedPlayers.length} players`;

        toast.success("Teams generated!", {
            description: `Created balanced teams with ${desc}`,
            duration: 2000,
            icon: "⚽",
        });

        navigate("/");
    };

    const toggleAll = () => {
        setSelectedPlayers(selectedPlayers.length === playersArr.length ? [] : playersArr.map((p) => p.id));
    };

    const togglePlayer = (playerId: string) => {
        setSelectedPlayers((prev) =>
            prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
        );
    };

    return (
        <div className={cn("flex flex-col h-full w-full px-4 pt-2 pb-4 space-y-2")}>
            {/* Search */}
            <ActionBarSingle>
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="w-full"
                />
            </ActionBarSingle>

            {/* Player Selection Grid */}
            <Card className="flex-1 flex flex-col min-h-0 bg-card overflow-hidden py-2 gap-0">
                <CardContent className="flex-1 h-full p-0">
                    <div className="h-full overflow-y-auto px-2 custom-scrollbar">
                        {sortedPlayers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {sortedPlayers.map((player, index) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: Math.min(index * 0.03, 0.3),
                                        }}
                                    >
                                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: click target wraps interactive Checkbox */}
                                        {/* biome-ignore lint/a11y/noStaticElementInteractions: click target wraps interactive Checkbox */}
                                        <div
                                            onClick={() => togglePlayer(player.id)}
                                            className={cn(
                                                "group flex items-center gap-3 p-3 rounded-lg",
                                                "border cursor-pointer select-none",
                                                "transition-all duration-200",
                                                selectedPlayers.includes(player.id)
                                                    ? "bg-primary/10 border-l-2 border-l-primary border-border/30 shadow-sm"
                                                    : "bg-card hover:bg-accent/50 border-border hover:border-accent",
                                                "hover:scale-[1.02] active:scale-[0.98]"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedPlayers.includes(player.id)}
                                                onCheckedChange={() => togglePlayer(player.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span
                                                className={cn(
                                                    "flex-1 text-sm font-medium",
                                                    selectedPlayers.includes(player.id) && "text-primary"
                                                )}
                                            >
                                                {player.name}
                                            </span>
                                            {selectedPlayers.includes(player.id) && (
                                                <CheckCircle2 className="h-4 w-4 text-primary opacity-60" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center space-y-2">
                                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                    <p className="text-muted-foreground">No players available</p>
                                    <p className="text-xs text-muted-foreground">Add players to get started</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bottom — placeholders + progress + generate */}
            <div className="space-y-2">
                {/* Placeholder controls */}
                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Placeholders</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePlaceholderCount(placeholderCount - 1)}
                            disabled={placeholderCount <= 0}
                            className="h-7 w-7 p-0"
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <Badge
                            variant={placeholderCount > 0 ? "default" : "outline"}
                            className="tabular-nums min-w-7 justify-center"
                        >
                            {placeholderCount}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePlaceholderCount(placeholderCount + 1)}
                            disabled={totalSelected >= MAX_PLAYERS}
                            className="h-7 w-7 p-0"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                canGenerate
                                    ? "bg-primary"
                                    : totalSelected > MAX_PLAYERS
                                      ? "bg-destructive"
                                      : "bg-muted-foreground/40"
                            )}
                            style={{
                                width: `${Math.min((totalSelected / MAX_PLAYERS) * 100, 100)}%`,
                            }}
                        />
                    </div>

                    <Badge variant={canGenerate ? "default" : "destructive"} className="gap-0.5 tabular-nums shrink-0">
                        <motion.span
                            key={totalSelected}
                            initial={{ scale: 1.3, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                            {totalSelected}
                        </motion.span>
                        /{MAX_PLAYERS}
                    </Badge>

                    <Button
                        variant={allSelected ? "destructive" : "outline"}
                        size="sm"
                        onClick={toggleAll}
                        className="h-7 text-xs shrink-0"
                    >
                        {allSelected ? "None" : "All"}
                    </Button>
                </div>

                <Button
                    variant="outline"
                    onClick={handleGenerateTeams}
                    disabled={!canGenerate}
                    className={cn(
                        "w-full h-10 font-semibold",
                        "transition-all duration-200",
                        canGenerate
                            ? "border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
                            : "opacity-50"
                    )}
                >
                    <Wand2 className={cn("mr-2 h-4 w-4", canGenerate && "animate-pulse")} />
                    Generate Balanced Teams
                </Button>
            </div>
        </div>
    );
};

export default TeamGenerator;
