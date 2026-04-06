import { motion } from "framer-motion";
import { RefreshCw, Share, Shuffle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormationSelector from "@/components/game/formation-selector";
import TeamArea from "@/components/game/pitch/team-area";
import Panel from "@/components/shared/panel";
import { ActionBarTwoColumn } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { useGame } from "@/context/game-provider";
import { usePlayers } from "@/hooks/use-players";
import { cn } from "@/lib/utils";
import { encodeStateToURL } from "@/lib/utils/url-state";

interface GameProps {
    isCompact: boolean;
    playerSize: number;
}

const Game: React.FC<GameProps> = ({ isCompact, playerSize }) => {
    const { clearGame, gamePlayers, currentFormation, generateTeams } = useGame();
    const { data: players = {} } = usePlayers();
    const navigate = useNavigate();

    const hasTeams = Object.keys(gamePlayers).length > 0;
    const playersArr = Object.values(players);

    const handleShare = async () => {
        try {
            const shareUrl = encodeStateToURL(gamePlayers, currentFormation);
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard!", {
                description: "Share this link to let others see your lineup",
                duration: 3000,
                icon: "🔗",
            });
        } catch {
            toast.error("Failed to copy link", {
                description: "Please try again",
                duration: 3000,
            });
        }
    };

    const handleRegenerate = () => {
        const currentIds = Object.keys(gamePlayers);
        const currentPlayers = playersArr.filter((p) => currentIds.includes(p.id));
        if (currentPlayers.length > 0) {
            generateTeams(currentPlayers);
            toast.success("Teams reshuffled!", {
                description: "New balanced teams from the same players",
                duration: 2000,
                icon: "🔄",
            });
        }
    };

    // Empty state — clean slate with two paths
    if (!hasTeams) {
        return (
            <div className="w-full h-full px-4 pt-2 pb-4">
                <div className="flex flex-col h-full w-full max-w-full items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col items-center gap-6 max-w-sm text-center"
                    >
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Generate balanced teams from your squad, or load an empty formation to build manually.
                        </p>

                        <div className="flex flex-col gap-2 w-full">
                            <Button
                                onClick={() => navigate("/generate")}
                                className={cn(
                                    "h-10 w-full font-semibold",
                                    "bg-linear-to-r from-(--quality-elite) to-(--quality-excellent)",
                                    "text-white shadow-lg hover:shadow-xl",
                                    "transition-all duration-200 active:scale-[0.98]"
                                )}
                            >
                                <Shuffle className="mr-2 h-4 w-4" />
                                Generate Teams
                            </Button>
                            <FormationSelector />
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Loaded state — teams on pitch
    return (
        <div className="w-full h-full px-4 pt-2 pb-4">
            <div className="flex flex-col h-full w-full max-w-full space-y-2">
                {/* Action Bar */}
                <ActionBarTwoColumn
                    className="h-9"
                    left={<FormationSelector />}
                    right={
                        <div className="flex gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "gap-1.5 text-xs font-medium",
                                    "border-(--quality-elite)/30 text-(--quality-elite)",
                                    "hover:bg-(--quality-elite-soft)/40 hover:border-(--quality-elite)/50",
                                    "transition-all duration-200 active:scale-[0.98]"
                                )}
                                onClick={handleRegenerate}
                            >
                                <RefreshCw size={14} />
                                <span className="hidden sm:inline">Reshuffle</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                onClick={handleShare}
                            >
                                <Share size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("text-muted-foreground hover:text-destructive", "transition-colors")}
                                onClick={clearGame}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    }
                />

                {/* Pitch — compact (stacked) */}
                {isCompact && (
                    <div className="flex-1 flex flex-col w-full gap-2">
                        <Panel variant="game">
                            <TeamArea team="A" playerSize={playerSize} />
                            <TeamArea team="B" playerSize={playerSize} />
                        </Panel>
                    </div>
                )}

                {/* Pitch — desktop (side by side) */}
                {!isCompact && (
                    <div className="flex-1 flex w-full gap-2 overflow-hidden">
                        <TeamArea team="A" playerSize={playerSize} />
                        <TeamArea team="B" playerSize={playerSize} />
                    </div>
                )}
            </div>
        </div>
    );
};
export default Game;
