import TeamArea from "@/components/pitch/team-area"; // Render directly
import Panel from "@/components/dialogs/panel"
import { Button } from "@/components/ui/button"
import { Share, Trash2 } from "lucide-react";
import { usePlayers } from "@/context/players-provider"
import { encodeStateToURL } from "@/data/state-manager";
import FormationSelector from "@/components/formation-selector"

// import { Separator } from "@/components/ui/separator"

interface GameProps {
    isCompact: boolean;
    playerSize: number;
}

const Game: React.FC<GameProps> = ({ isCompact, playerSize }) => {
    const { clearGame, gamePlayers } = usePlayers();
    const iconSize = isCompact ? 15 : 18;

    const handleShare = () => {
        const shareUrl = encodeStateToURL(gamePlayers);
        navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
    };

    return (
        <div className="w-full h-full p-2">
            {/* Layout for small screens (stacked and tall) */}
            <div className='flex flex-col h-full w-full max-w-[100%] '>

                <div className="flex-1 max-h-[40px] w-full flex overflow-hidden">
                    <div className={`flex-1 flex transition-all duration-200`}>
                        <FormationSelector />
                    </div>

                    <Button variant="ghost"
                        className={`flex-1 flex items-center justify-center  transition-all duration-200 text-red-600 max-h-[60px]`}
                        onClick={clearGame}>
                        <Trash2 size={18} />
                        <span>Clear</span>
                    </Button>

                    <Button variant="ghost"
                        className={`flex-1 flex items-center justify-center transition-all duration-200`}
                        onClick={handleShare}>
                        <Share size={iconSize} />
                        <span>Share</span>
                    </Button>
                </div>

                {isCompact && (
                  <div className="flex-1 flex flex-col w-full gap-2 overflow-hidden">
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
