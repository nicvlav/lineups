import PlayerContainer from "./PlayerContainer";
import React from "react";

const PlayerArea = ({ team, teamPlayers, playerSize = 80 }) => {

  return (
    <div className="w-full h-full flex flex-col gap-4"> {/* Ensure column flex layout */}
      {/* Team Title Bar */}
      <div className="flex-none h-[40px] bg-gray-900 rounded-lg shadow-lg flex items-center p-4">
        Team {team}
      </div>

      {/* Player Container (fills remaining space) */}
      <div className="flex-1 p-4 bg-gray-900 rounded-lg shadow-lg">
        <PlayerContainer team={team} teamPlayers={teamPlayers} playerSize={playerSize} />
      </div>
    </div>
  );
};

export default PlayerArea;
