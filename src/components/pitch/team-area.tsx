import Pitch from '@/components/pitch/pitch'
import { usePlayers } from "@/context/players-provider";

interface TeamAreaProps {
  team: string;
  playerSize: number;
}

const TeamArea: React.FC<TeamAreaProps> = ({ team, playerSize }) => {
  const { gamePlayers } = usePlayers();

  const teamPlayers = Object.values(gamePlayers).filter((p) => p.team === team);

  return (
    <div className="w-full h-full flex flex-co bg-card"> {/* Ensure column flex layout */}
      {/* Team Title Bar */}
      {/* <div className="flex-none h-[20px] rounded-lg shadow-lg flex items-center pl-2">
         Team {team}
      </div> */}

      {/* Player Container (fills remaining space) */}
      <div className="flex-1 rounded-lg shadow-lg overflow-x-clip">
        <Pitch team={team} teamPlayers={teamPlayers} playerSize={playerSize} />
      </div>
    </div>
  );
};

export default TeamArea;
