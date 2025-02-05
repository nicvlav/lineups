import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlayersProvider } from "./components/global/PlayersContext";
import PlayerList from "./components/players/PlayerList";
import CurrentGame from "./components/game/CurrentGame";
import React from "react";

const App = () => {
  return (
    <PlayersProvider>
      <DndProvider backend={HTML5Backend}>
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
          <PlayerList />
          <CurrentGame />
        </div>
      </DndProvider>
    </PlayersProvider>
  );
};
export default App;
