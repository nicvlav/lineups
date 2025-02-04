import PlayerArea from "./PlayerArea";
import React, { useState, useEffect } from "react";
import axios from "axios"
const CurrentGame = ({ players }) => {
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
        {/* Multiple instances of PlayerArea */}
        <PlayerArea players={players} />
        {/* <PlayerArea players={players} /> */}
      </div>
  );
};
export default CurrentGame;
