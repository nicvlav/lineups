import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlayersProvider } from "./components/global/PlayersContext.jsx";
import CurrentGame from "./components/game/CurrentGame.jsx";
import Layout from "./components/Layout.jsx";
import React from "react";

const App = () => {
  return (
    <PlayersProvider>
      <DndProvider backend={HTML5Backend}>
        <Layout>
          {/* Ensure this div fills the entire screen */}
          {/* <div className="h-full w-full flex"> */}
            <CurrentGame className="flex-1" />
          {/* </div> */}
        </Layout>
      </DndProvider>
    </PlayersProvider>
  );
};


export default App;
