import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlayersProvider } from "./components/global/PlayersContext.jsx";
import GamePage from "./components/game/GamePage.jsx";
import React from "react";

const App = () => {
  return (
    <PlayersProvider>
      <DndProvider backend={HTML5Backend}>
        <div>
          <GamePage />
        </div>
      </DndProvider>
    </PlayersProvider>
  );
};
export default App;
