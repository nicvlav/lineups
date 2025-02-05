
import PlayerArea from "./PlayerArea";
import React, { useState, useContext, useRef, useEffect } from "react";
import { PlayersContext } from "../global/PlayersContext";

const CurrentGame = () => {
  const { players, gameData, addPlayer, deletePlayer, loading } = useContext(PlayersContext);



  if (loading || !gameData) return <div>Loading game data...</div>;

  return (
    <div
      className="relative bg-quaternary"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        overflow: "auto",
        padding: "2px",
        backgroundColor: "#9C7E63",
      }}
    >
      <PlayerArea team="team1" players={gameData.teams.team1.players} />
      {/* <PlayerArea team="team2" players={gameData.teams.team2} /> */}
    </div>
  );
};

export default CurrentGame;
