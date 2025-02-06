
import PlayerArea from "./PlayerArea";
import React, { useState, useContext, useRef, useEffect } from "react";
import { PlayersContext } from "../global/PlayersContext";

const CurrentGame = () => {
  const { players, gameData, addPlayer, deletePlayer, loading } = useContext(PlayersContext);

  if (loading || !gameData || !gameData.teams.A || !gameData.teams.B) return <div>Loading game data...</div>;

  return (
    <div
      className="relative bg-secondary"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        overflow: "auto",
        padding: "2px",
        gap: "2px",
        // backgroundColor: "#9C7E63",
      }}
    >
      <PlayerArea team="A" players={gameData.teams.A.players} />
      <PlayerArea team="B" players={gameData.teams.B.players} />
    </div>
  );
};

export default CurrentGame;
