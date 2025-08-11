import TeamArea from "@/components/pitch/team-area"; // Render directly
import Panel from "@/components/dialogs/panel"
import { Button } from "@/components/ui/button"
import { Share, Trash2 } from "lucide-react";
import { usePlayers } from "@/context/players-provider"
import { encodeStateToURL } from "@/data/state-manager";
import FormationSelector from "@/components/formation-selector"
import { cn } from "@/lib/utils";
import { ANIMATIONS } from "@/lib/design-tokens";
import { ActionBarTwoColumn } from "@/components/ui/action-bar";
import { toast } from "sonner";

// import { Separator } from "@/components/ui/separator"

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
        <div className="w-full h-full p-4">
            {/* Layout for small screens (stacked and tall) */}
            <div className='flex flex-col h-full w-full max-w-[100%]'>

                {/* Action Bar - Professional alignment using unified component */}
                <ActionBarTwoColumn
                    left={<FormationSelector />}
                    right={
                        <div className="flex gap-2">
                            <Button 
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "text-red-600 hover:text-red-700 hover:bg-red-50 w-16",
                                    "dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30",
                                    ANIMATIONS.transition.normal
                                )}
                                onClick={clearGame}
                            >
                                <Trash2 size={16} />
                                <span className="hidden sm:inline ml-2">Clear</span>
                            </Button>

                            <Button 
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "hover:bg-accent hover:text-accent-foreground w-16",
                                    ANIMATIONS.transition.normal
                                )}
                                onClick={handleShare}
                            >
                                <Share size={16} />
                                <span className="hidden sm:inline ml-2">Share</span>
                            </Button>
                        </div>
                    }
                />

                {isCompact && (
                  <div className="flex-1 flex flex-col w-full gap-2">
                        <Panel>
                            {/* First Div */}
                            <TeamArea team="A" playerSize={playerSize} />

                            {/* Second Div */}
                            <TeamArea team="B" playerSize={playerSize} />
                        </Panel>


                    </div>
                )}

                {/* Layout for large screens (side by side) */}
                {!isCompact && (
                    <div className="flex-1 flex w-full gap-2 overflow-hidden">
                        {/* First Div */}
                        <TeamArea team="A" playerSize={playerSize} />

                        {/* Second Div */}
                        <TeamArea team="B" playerSize={playerSize} />
                    </div>
                )}
            </div>
        </div>
    )
}
export default Game;
