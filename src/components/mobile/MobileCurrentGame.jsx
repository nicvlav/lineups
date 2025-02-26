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
            <div className="flex-[1] flex items-center justify-center bg-gray-800 pt-[5px] pb-[5px] ">
                <PlayerArea team="A" teamPlayers={getTeamPlayers("A")} playerSize={50} />
            </div>
    
            {/* Team B with extra padding at the bottom */}
            <div className="flex-[1] flex items-center justify-center bg-gray-700 pt-[5px] pb-[20px]">
                <PlayerArea team="B" teamPlayers={getTeamPlayers("B")} playerSize={50} />
            </div>
        </div>
    );
    
    
};

export default MobileCurrentGame;