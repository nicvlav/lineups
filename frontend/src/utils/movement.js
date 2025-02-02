import axios from "axios";

export const calculateNewPlayerPosition = (event, containerRef, selectedPlayer) => {
  const boundingRect = containerRef.current.getBoundingClientRect();
  const newX = (event.clientX - boundingRect.left) / boundingRect.width; // Normalize to 0-1
  const newY = (event.clientY - boundingRect.top) / boundingRect.height; // Normalize to 0-1

  return { x: newX, y: newY };
};

// movement.js
export const updatePlayerPosition = (players, selectedPlayer, newPos, playerSize) => {
  const halfSize = playerSize / 2;
  const maxWidth = 1 - halfSize;
  const maxHeight = 1 - halfSize;

  const clampedNewPos = {
    x: Math.max(halfSize, Math.min(newPos.x, maxWidth)),
    y: Math.max(halfSize, Math.min(newPos.y, maxHeight)),
  };

  return players.map(player =>
    player.name === selectedPlayer.name
      ? { ...player, x: clampedNewPos.x, y: clampedNewPos.y }
      : player
  );
};

// Function to update player position in the backend
export const updatePlayerInBackend = async (playerUID, newPos) => {
  try {
    // Await the axios PUT request and store the response
    const response = await axios.put(
      `http://localhost:8000/players/${playerUID}?x=${newPos.x}&y=${newPos.y}`
    );

    // Log the response data from the backend
    console.log("Backend Response:", response.data);  // Logs the response from the FastAPI backend

    console.log("Player position updated in backend.");
  } catch (error) {
    console.error("Error updating player position in backend:", error);
  }
};
