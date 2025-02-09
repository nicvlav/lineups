import Sidebar from "./sidebar/Sidebar";
import CurrentGame from "./draggables/CurrentGame.jsx";
import React from "react";

const GamePage = () => {
  return (
        <div
          className="relative"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            // justifyContent: "center",
            height: "100vh",
            width: "100vw",
            overflow: "auto",
            padding: "4px",
            // backgroundColor: "#9C7E63",
          }}
        >
          <Sidebar />
          <CurrentGame />
        </div>
  );
};

export default GamePage;
