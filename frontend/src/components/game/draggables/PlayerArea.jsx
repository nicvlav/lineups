import PlayerContainer from "./PlayerContainer";
import React, { useState } from "react";

const PlayerArea = ({ team, players }) => {
  return (
    <div
      className="relative bg-primary"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        overflow: "auto",
        // padding: "4px",
        // backgroundColor: "#f0f0f0",
      }}
    >
      <div
      className="relative bg-primary"
        style={{
          width: "100%", // Adjust width if necessary
          height: "40px", // Ensuring container doesn't take full height
          // border: "2px solid black", // Debugging: See if it's rendering
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Team {team}
      </div>
      <div
        style={{
          width: "100%", // Adjust width if necessary
          height: "100vh", // Ensuring container doesn't take full height
          // border: "2px solid black", // Debugging: See if it's rendering
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PlayerContainer team = {team} players={players} />
      </div>
    </div>
  );
};

export default PlayerArea;
