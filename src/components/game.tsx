import TeamArea from "@/components/pitch/team-area"; // Render directly

// import { Separator } from "@/components/ui/separator"

interface GameProps {
    width: number;
    height: number;
  }
  
const Game: React.FC<GameProps> = ({ width, height }) => {
    const isSmallScreen = width < 768; // You can customize this to match your breakpoint
    const playerSize = (isSmallScreen ? Math.min(height * 2, width) : Math.min(height, width / 2)) / 12;

    return (
        <div className="w-full h-full">
            {/* Layout for small screens (stacked and tall) */}
            {isSmallScreen && (
                <div className="flex flex-col pl-2 pr-2 pb-5 gap-5 h-[180vh] w-full max-w-[100%] mx-auto">
                    {/* First Div */}
                    <TeamArea team="A" playerSize={playerSize} />

                    {/* Second Div */}
                    <TeamArea team="B" playerSize={playerSize} />
                </div>
            )}

            {/* Layout for large screens (side by side) */}
            {!isSmallScreen && (
                <div className="flex  w-full h-full pl-2 pr-2 gap-2">
                    {/* First Div */}
                    <TeamArea team="A" playerSize={playerSize} />

                    {/* Second Div */}
                    <TeamArea team="B" playerSize={playerSize} />
                </div>
            )}

        </div>
    )
}

export default Game;
