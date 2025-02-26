import PlayerContainer from "./PlayerContainer";
import React from "react";

const PlayerArea = ({ team, teamPlayers, playerSize = 80 }) => {

  return (
    <div className="w-full h-full flex flex-col gap-2"> {/* Ensure column flex layout */}
      {/* Team Title Bar */}
      <div className="flex-none h-[40px] bg-gray-900  text-white rounded-lg shadow-lg flex items-center p-2">
        Team {team}
      </div>

      {/* Player Container (fills remaining space) */}
      <div className="flex-1 p-3 bg-gray-900 rounded-lg shadow-lg">
        <PlayerContainer team={team} teamPlayers={teamPlayers} playerSize={playerSize} />
      </div>
    </div>
  );
};

export default PlayerArea;
