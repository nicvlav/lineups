// CurrentGame Component
import PlayerArea from "./PlayerArea";
import React, { useContext } from "react";
import { PlayersContext } from "../global/PlayersContext";

const CurrentGame = () => {
    const { getTeamPlayers, loading } = useContext(PlayersContext);

    if (loading) {
        return <div>Loading game data...</div>;
    }

    return (
        <div className="relative bg-secondary" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", height: "100vh", width: "100vw", overflow: "auto", padding: "2px", gap: "2px" }}>
            <PlayerArea team="A" players={getTeamPlayers("A")} />
            <PlayerArea team="B" players={getTeamPlayers("B")} />
        </div>
    );
};

export default CurrentGame;
