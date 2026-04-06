import Pitch from "@/components/game/pitch/pitch";
import { useGame } from "@/context/game-provider";

interface TeamAreaProps {
    team: string;
    playerSize: number;
}

const TeamArea: React.FC<TeamAreaProps> = ({ team, playerSize }) => {
    const { gamePlayers } = useGame();

    const teamPlayers = Object.values(gamePlayers).filter((p) => p.team === team);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 rounded-lg overflow-x-clip">
                <Pitch team={team} teamPlayers={teamPlayers} playerSize={playerSize} />
            </div>
        </div>
    );
};

export default TeamArea;
