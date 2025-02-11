// CurrentGame Component
import PlayerArea from "./PlayerArea";
import React, { useContext } from "react";
import { PlayersContext } from "../../global/PlayersContext.jsx";

const CurrentGame = () => {
    const { players } = useContext(PlayersContext);

    const getTeamPlayers = (team) => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.team === team);
    };

    return (
        <div className="relative bg-secondary" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", height: "100vh", width: "100vw", overflow: "auto", padding: "2px", gap: "2px" }}>
            <PlayerArea team="A" teamPlayers={getTeamPlayers("A")} />
            <PlayerArea team="B" teamPlayers={getTeamPlayers("B")}/>
        </div>
    );
};

export default CurrentGame;
