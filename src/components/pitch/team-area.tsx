import Pitch from '@/components/pitch/pitch'
import { GamePlayer } from "@/data/player-types";

interface TeamAreaProps {
  team: string;
  teamPlayers: GamePlayer[];
  playerSize: number;
}

const TeamArea: React.FC<TeamAreaProps> = ({ team, teamPlayers, playerSize}) => {

  return (
    <div className="w-full h-full flex flex-col gap-2 bg-card"> {/* Ensure column flex layout */}
      {/* Team Title Bar */}
      <div className="flex-none h-[40px] rounded-lg shadow-lg flex items-center p-2">
        Team {team}
      </div>

      {/* Player Container (fills remaining space) */}
      <div className="flex-1 p-3 rounded-lg shadow-lg">
        <Pitch team={team} teamPlayers={teamPlayers} playerSize={playerSize} />
      </div>
    </div>
  );
};

export default TeamArea;
