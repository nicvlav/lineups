import PlayerContainer from "./PlayerContainer";
import PlayerPanel from "./PlayerPanel";
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
        backgroundColor: "#f0f0f0",
      }}
    >
      <div>{team}</div>
      <div
        style={{
          width: "100%", // Adjust width if necessary
          height: "65vh", // Ensuring container doesn't take full height
          // border: "2px solid black", // Debugging: See if it's rendering
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <PlayerContainer players={players} />
      </div>

      <div
        style={{
          width: "100%",
          height: "30vh", // Ensures PlayerPanel has space to render
          // border: "2px solid red", // Debugging: See if it's rendering
          overflowY: "auto",
        }}
      >
        <PlayerPanel players={players} />
      </div>
    </div>
  );
};

export default PlayerArea;
