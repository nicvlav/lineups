import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect'; // Use this to detect touch devices
import { PlayersProvider } from "./utility/PlayersContext.jsx";

import Layout from "./components/desktop/Layout.jsx";
import MobileLayout from "./components/mobile/MobileLayout.jsx";
import React from "react";

const App = () => {
  const isMobile = window.innerWidth < 768; // Adjust for responsiveness
  const backend = isMobile ? TouchBackend : HTML5Backend;

  return (
    <DndProvider backend={backend}>
      <PlayersProvider>
        {isMobile ? (
          <MobileLayout>
          </MobileLayout>
        ) : (
          <Layout>
          </Layout>
        )}
      </PlayersProvider>
    </DndProvider>
  );
};

export default App;