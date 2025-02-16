import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect'; // Use this to detect touch devices
import { PlayersProvider } from "./components/global/PlayersContext.jsx";

import CurrentGame from "./components/game/CurrentGame.jsx";
import Layout from "./components/Layout.jsx";
import React from "react";

const App = () => {
  const backend = isMobile ? TouchBackend : HTML5Backend;

  return (
    <DndProvider backend={backend}>
      <PlayersProvider>
        <Layout>
          <CurrentGame className="flex-1" />
        </Layout>
      </PlayersProvider>
    </DndProvider>
  );
};

export default App;