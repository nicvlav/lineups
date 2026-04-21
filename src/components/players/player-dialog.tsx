import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import MiniPitch from "@/components/game/pitch/mini-pitch";
import RadarChart, { calculateRadarAxes } from "@/components/players/radar-chart";
import Modal from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { GamePlayer } from "@/context/game-provider";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/hooks/use-players";
import { computeLabel } from "@/lib/capabilities";
import { getRatingTierScheme, getStatBarColor, getTierCssVar } from "@/lib/color-system";
import { cn } from "@/lib/utils";
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

interface StatsTabProps {
    fullPlayer: Player | null;
}

const StatsTab: React.FC<StatsTabProps> = ({ fullPlayer }) => {
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

    const traitEntries = TRAIT_KEYS.map((key) => ({ key, value: fullPlayer.traits[key] }));
    const avg = traitEntries.reduce((sum, e) => sum + e.value, 0) / traitEntries.length;
    const standoutTraits = traitEntries
        .filter((e) => e.value - avg >= STANDOUT_THRESHOLD)
        .sort((a, b) => b.value - a.value)
        .slice(0, STANDOUT_COUNT);

    return (
        <div className="space-y-4 px-1 py-3 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2">
                <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
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

            <div className="flex flex-col items-center gap-3">
                <RadarChart axes={calculateRadarAxes(fullPlayer.capabilities)} size={160} tierRating={overallRounded} />

                {standoutTraits.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {standoutTraits.map((entry) => (
                            <span
                                key={entry.key}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                                {traitLabelMap[entry.key]}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Zone Effectiveness
                </h3>
                <div className="space-y-1.5">
                    {ZONE_KEYS.map((zone) => {
                        const value = Math.round(fullPlayer.zoneEffectiveness[zone]);
                        return (
                            <div
                                key={zone}
                                className="bg-card/50 border border-border/40 rounded-lg p-2.5 transition-colors hover:border-border/70"
                            >
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-medium">{zoneLabelMap[zone]}</span>
                                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                                        {value}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(getStatBarColor(value), "h-1.5 rounded-full transition-all")}
                                        style={{ width: `${Math.min(value, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

interface PitchTabProps {
    player: GamePlayer;
    onClose: () => void;
}

const PitchTab: React.FC<PitchTabProps> = ({ player, onClose }) => {
    const { gamePlayers, switchToRealPlayer } = useGame();
    const [view, setView] = useState<"own" | "other">("own");

    const ownTeam = player.team;
    const otherTeam = ownTeam === "A" ? "B" : "A";
    const shownTeam = view === "own" ? ownTeam : otherTeam;
    const teamPlayers = Object.values(gamePlayers).filter((p) => p.team === shownTeam);

    const handleTap = (targetId: string) => {
        switchToRealPlayer(player, targetId);
        onClose();
    };

    const teamViews: { value: "own" | "other"; label: string }[] = [
        { value: "own", label: "Your team" },
        { value: "other", label: "Other team" },
    ];

    return (
        <div className="flex flex-col h-full gap-3 px-1 py-3">
            <div className="flex gap-1.5 justify-center">
                {teamViews.map((v) => {
                    const isActive = view === v.value;
                    return (
                        <button
                            key={v.value}
                            type="button"
                            onClick={() => setView(v.value)}
                            className="relative text-xs font-medium px-4 py-1.5 rounded-lg transition-colors duration-200 active:scale-[0.97]"
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="pitch-team-toggle"
                                    className="absolute inset-0 rounded-lg bg-primary/15"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <span
                                className={cn(
                                    "relative z-10",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {v.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 min-h-0">
                <MiniPitch
                    team={shownTeam}
                    teamPlayers={teamPlayers}
                    currentPlayerId={player.id}
                    onPlayerTap={handleTap}
                />
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
                Tap any player to swap positions with <span className="font-medium text-foreground">{player.name}</span>
            </p>
        </div>
    );
};

interface SubstituteTabProps {
    player: GamePlayer;
    players: Record<string, Player>;
    onClose: () => void;
}

const SubstituteTab: React.FC<SubstituteTabProps> = ({ player, players, onClose }) => {
    const { gamePlayers, switchToRealPlayer } = useGame();
    const [searchTerm, setSearchTerm] = useState("");

    const available = Object.values(players)
        .filter((p) => !(p.id in gamePlayers))
        .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSub = (newPlayer: Player) => {
        switchToRealPlayer(player, newPlayer.id);
        onClose();
    };

    return (
        <div className="flex flex-col h-full space-y-2.5 px-1 py-3">
            <Input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {available.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No available players</p>
                ) : (
                    available.map((p) => (
                        <button
                            type="button"
                            key={p.id}
                            onClick={() => handleSub(p)}
                            className={cn(
                                "w-full px-3 py-2.5 text-left rounded-lg text-sm",
                                "bg-card border border-border/40",
                                "hover:bg-primary/10 hover:border-primary/40 hover:text-primary",
                                "transition-all duration-200"
                            )}
                        >
                            <span className="font-medium">{p.name}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

type TabValue = "pitch" | "stats" | "sub";
const TAB_ITEMS: { value: TabValue; label: string }[] = [
    { value: "pitch", label: "Swap" },
    { value: "stats", label: "Stats" },
    { value: "sub", label: "Substitute" },
];

interface PlayerDialogProps {
    player: GamePlayer;
    isOpen: boolean;
    onClose: () => void;
}

const PitchPlayerDialog: React.FC<PlayerDialogProps> = ({ player, isOpen, onClose }) => {
    const { data: players = {} } = usePlayers();
    const { removeFromGame, currentFormation } = useGame();
    const [activeTab, setActiveTab] = useState<TabValue>("pitch");

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
                <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                    <div
                        className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-2",
                            player.team === "A"
                                ? "bg-cyan-400 border-cyan-300/60 text-white"
                                : "bg-lime-400 border-lime-300/60 text-gray-900"
                        )}
                        style={{
                            boxShadow:
                                player.team === "A"
                                    ? "0 0 14px 2px hsl(200 80% 60%/0.28)"
                                    : "0 0 14px 2px hsl(84 70% 55%/0.28)",
                        }}
                    >
                        {fullPlayer?.avatarUrl ? (
                            <img
                                src={fullPlayer.avatarUrl}
                                alt={playerName}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <span className="text-sm font-bold tracking-tight">{player.exactPosition}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold truncate leading-tight">{playerName}</h2>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            <span className="text-foreground/80 font-medium">
                                {POSITION_NAMES[player.exactPosition]}
                            </span>
                            <span className="mx-1.5 text-border">·</span>
                            <span
                                className={cn("font-semibold", player.team === "A" ? "text-cyan-400" : "text-lime-500")}
                            >
                                Team {player.team}
                            </span>
                            {currentFormation && (
                                <>
                                    <span className="mx-1.5 text-border">·</span>
                                    <span>{currentFormation.name}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {player.isGuest ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <SubstituteTab player={player} players={players} onClose={onClose} />
                    </div>
                ) : (
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                        className="flex-1 flex flex-col overflow-hidden"
                    >
                        <div className="flex gap-1 justify-center mt-2 mb-1 border-b border-border/40 pb-1">
                            {TAB_ITEMS.map((tab) => {
                                const isActive = activeTab === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => setActiveTab(tab.value)}
                                        className="relative text-sm font-medium px-4 py-1.5 rounded-lg transition-colors duration-200 active:scale-[0.97]"
                                    >
                                        {isActive && (
                                            <motion.span
                                                layoutId="player-dialog-tab"
                                                className="absolute inset-0 rounded-lg bg-primary/15"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <span
                                            className={cn(
                                                "relative z-10",
                                                isActive
                                                    ? "text-primary"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {tab.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <TabsContent value="pitch" className="flex-1 flex flex-col overflow-hidden">
                            <PitchTab player={player} onClose={onClose} />
                        </TabsContent>

                        <TabsContent value="stats" className="flex-1 overflow-y-auto">
                            <StatsTab fullPlayer={fullPlayer} />
                        </TabsContent>

                        <TabsContent value="sub" className="flex-1 flex flex-col overflow-hidden">
                            <SubstituteTab player={player} players={players} onClose={onClose} />
                        </TabsContent>
                    </Tabs>
                )}

                <div className="pt-3 border-t border-border/40">
                    <Button
                        onClick={handleRemove}
                        variant="outline"
                        size="sm"
                        disabled={player.isGuest}
                        className={cn(
                            "w-full gap-1.5 text-xs font-medium",
                            "border-destructive/30 text-destructive",
                            "hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive",
                            "transition-all duration-200"
                        )}
                    >
                        <Trash2 size={14} />
                        Remove from Game
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PitchPlayerDialog;
