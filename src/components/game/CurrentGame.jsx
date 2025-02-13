// CurrentGame Component
import PlayerArea from "./draggables/PlayerArea";
import React, { useContext } from "react";
import { PlayersContext } from "../global/PlayersContext.jsx";

const CurrentGame = ({className}) => {
    const { players } = useContext(PlayersContext);

    const getTeamPlayers = (team) => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.team === team);
    };

    return (
        <div className={`h-full flex gap-4 bg-gray-900 p-4 rounded-lg shadow-lg ${className}`}>
            <PlayerArea team="A" teamPlayers={getTeamPlayers("A")} />
            <PlayerArea team="B" teamPlayers={getTeamPlayers("B")}/> 
        </div>
    );
};

export default CurrentGame;
