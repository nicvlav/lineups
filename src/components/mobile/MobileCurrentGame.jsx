import PlayerArea from "../pitch/PlayerArea";
import React, { useContext } from "react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";

const MobileCurrentGame = ({ className }) => {
    const { players } = useContext(PlayersContext);

    const getTeamPlayers = (team) => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.team === team);
    };

    return (
        <div className="flex flex-col h-[200%]">
            {/* Team A */}
            <div className="flex-1 flex items-center justify-center bg-gray-800">
                <PlayerArea team="A" teamPlayers={getTeamPlayers("A")} playerSize={50} />
            </div>

            {/* Team B */}
            <div className="flex-1 flex items-center justify-center bg-gray-700">
                <PlayerArea team="B" teamPlayers={getTeamPlayers("B")} playerSize={50} />
             </div>
        </div>
    );
};

export default MobileCurrentGame;