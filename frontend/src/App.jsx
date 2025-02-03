import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PlayerContainer from "./components/PlayerContainer";
import PlayerPanel from "./components/PlayerPanel";
import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [players, setPlayers] = useState([]);

  // Fetch players data from the server when the component mounts
  useEffect(() => {
    axios.get("http://localhost:8000/players")
      .then((response) => {
        setPlayers(response.data);
      })
      .catch((error) => {
        console.error("Error fetching players:", error);
      });
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          height: "100vh",  // Take full viewport height
          width: "100vw",   // Take full viewport width
          display: "flex",  // Enable Flexbox layout
          flexDirection: "row",  // Stack the content vertically
          justifyContent: "center",  // Center the content vertically
          alignItems: "center",  // Center horizontally
          textAlign: "center",  // Center the header text
          minHeight: "400px",  // Minimum height of 400px (adjust as needed)
          minWidth: "400px",   // Minimum width of 400px (adjust as needed)
          overflow: "auto",    // Allow scrolling when content overflows
        }}>
        <PlayerContainer
          players={players}
          playerSize={40}
        />
        <PlayerPanel
          players={players}
        />
      </div>

    </DndProvider>
  );
};

export default App;
