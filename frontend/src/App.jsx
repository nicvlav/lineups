// App.jsx
import React, { useState, useEffect } from "react";
import Pitch from "./components/Pitch";
import axios from "axios";

const App = () => {
  const [players, setPlayers] = useState([]);
  const padding = 20; // Padding inside the pitch (inside the container)

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
    <div
      style={{
        height: "100vh",  // Take full viewport height
        width: "100vw",   // Take full viewport width
        display: "flex",  // Enable Flexbox layout
        flexDirection: "column",  // Stack the content vertically
        justifyContent: "center",  // Center the content vertically
        alignItems: "center",  // Center horizontally
        textAlign: "center",  // Center the header text
        minHeight: "400px",  // Minimum height of 400px (adjust as needed)
        minWidth: "400px",   // Minimum width of 400px (adjust as needed)
        overflow: "auto",    // Allow scrolling when content overflows
      }}
    >
      <h1>Pitch</h1>
      {/* Pass the padding to the Pitch component */}
      <Pitch
        players={players}
        setPlayers={setPlayers}
        padding={padding}
      />
    </div>
  );
};

export default App;