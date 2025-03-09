import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect'; // Use this to detect touch devices
import { PlayersProvider } from "./utility/PlayersContext.jsx";

import Layout from "./components/desktop/Layout.jsx";
import MobileLayout from "./components/mobile/MobileLayout.jsx";
import React, { useState, useEffect } from "react";


const App = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 620);

    useEffect(() => {
      const handleResize = () => {
        setMobile(window.innerWidth < 560);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
  

  const backend = isMobile ? TouchBackend : HTML5Backend;
  const options = mobile
  ? {
      enableMouseEvents: false, // Prevents conflicts
      enableTouchEvents: true,
      // delayTouchStart: 10, // Adds a small delay before drag starts
      ignoreContextMenu: true, // Prevents issues with right-click
      usePointerEvents: true,
      preview: true,
    }
  : {}; // No extra options for desktop

  return (
    <DndProvider backend={backend} options={options}>
      <PlayersProvider>
        {mobile ? <MobileLayout /> : <Layout />}
      </PlayersProvider>
    </DndProvider>
  );
};

export default App;
