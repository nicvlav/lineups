import TeamArea from "@/components/pitch/team-area";
import { Button } from "@/components/ui/button"
import { Share, Trash2 } from "lucide-react";
import { usePlayers } from "@/contexts/players-provider"
import { encodeStateToURL } from "@/lib/utils/state-manager";
import FormationSelector from "@/components/game/formation-selector"
import { ActionBarTwoColumn } from "@/components/ui/action-bar";
import { toast } from "sonner";
import { PAGE_LAYOUT } from "@/lib/design-tokens/page-tokens";
import { GAP, SIZES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils/cn";

interface GameProps {
    isCompact: boolean;
    playerSize: number;
}

const Game: React.FC<GameProps> = ({ isCompact, playerSize }) => {
    const { clearGame, gamePlayers } = usePlayers();

    const handleShare = async () => {
        try {
            const shareUrl = encodeStateToURL(gamePlayers);
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard!", {
                description: "Share this link to let others see your lineup",
                duration: 3000,
                icon: '🔗'
            });
        } catch (error) {
            toast.error("Failed to copy link", {
                description: "Please try again",
                duration: 3000
            });
        }
    };

    return (
        <div className={cn(PAGE_LAYOUT.container, "space-y-4")}>
            {/* Action Bar - Consistent with other pages */}
            <div className={PAGE_LAYOUT.actionBar.wrapper}>
                <ActionBarTwoColumn
                    left={<FormationSelector />}
                    right={
                        <div className={cn("flex", GAP.sm)}>
                            <Button 
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={clearGame}
                            >
                                <Trash2 className={SIZES.icon.xs} />
                                <span className="hidden sm:inline ml-2">Clear</span>
                            </Button>

                            <Button 
                                variant="ghost"
                                size="sm"
                                onClick={handleShare}
                            >
                                <Share className={SIZES.icon.xs} />
                                <span className="hidden sm:inline ml-2">Share</span>
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Game Area - Clean layout */}
            <div className={PAGE_LAYOUT.content.wrapper}>
                {isCompact ? (
                    <div className={cn("flex flex-col h-full", GAP.md)}>
                        <TeamArea team="A" playerSize={playerSize} />
                        <TeamArea team="B" playerSize={playerSize} />
                    </div>
                ) : (
                    <div className={cn("flex h-full", GAP.md)}>
                        <TeamArea team="A" playerSize={playerSize} />
                        <TeamArea team="B" playerSize={playerSize} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default Game;