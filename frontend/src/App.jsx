import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PlayerArea from "./components/PlayerArea";
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
    </DndProvider>
  );
};
export default App;
