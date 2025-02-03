import React, { useEffect, useState } from 'react';

import { calculateNewPlayerPosition, updatePlayerPosition, updatePlayerInBackend } from "./../utils/movement"; // Import the utility
import DraggablePlayer from './DraggablePlayer';

// Helper function to convert player coordinates (0-1) to pixel values for positioning
const getPlayerPosition = (player, playerSize, containerWidth, containerHeight) => {
  const halfSize = playerSize / 2;
  const maxWidth = containerWidth - halfSize;
  const maxHeight = containerHeight - halfSize;

  const left = Math.max(halfSize, Math.min(player.x * containerWidth, maxWidth)); // Convert relative x to pixel value
  const top = Math.max(halfSize, Math.min(player.y * containerHeight, maxHeight)); // Convert relative y to pixel value

  return { left, top };

};

const PlayerContainer = ({ players, playerSize = 50 }) => {
  const [playerList, setPlayerList] = useState(players);

  // Set initial positions of players when container size changes
  const [containerSize, setContainerSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight, // Set default height or calculate dynamically
  });

  useEffect(() => {
    const handleResize = () => {
      setContainerSize({
        width: window.innerWidth,
        height: window.innerHeight, // Set the new height based on container's height (or dynamic calculation)
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size calculation

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleDrop = (player, dropX, dropY) => {
    // Clamp the drop position to container bounds
    player.x = Math.max(0, Math.min(dropX, 1)); // Clamp within [0, 1] for x position
    player.y = Math.max(0, Math.min(dropY, 1)); // Clamp within [0, 1] for y position

    // Refresh the player positions
    setPlayerList([...players]); // Trigger re-render by updating the state
  };

  return (
    <div
      className="relative bg-green-500"
      style={{
        width: '100%',
        height: '100%',
      }}
      onDrop={(e) => {
        // Prevent default behavior (e.g., open as link)
        e.preventDefault();

        // Find the player being dropped
        const playerUID =  parseInt(e.dataTransfer.getData('playerUID'));

        console.log(playerUID);
        const player = players.find((p) => p.uid === playerUID);

        if (player) {
          // Calculate the position where the drop occurred
          const rect = e.target.getBoundingClientRect();
          const dropX = (e.clientX - rect.left) / rect.width; // Calculate normalized x
          const dropY = (e.clientY - rect.top) / rect.height; // Calculate normalized y

          handleDrop(player, dropX, dropY);
        }
      }}
      onDragOver={(e) => e.preventDefault()} // Allow the drop by preventing default
    >
      {players.map((player) => {
        const { left, top } = getPlayerPosition(player, playerSize, containerSize.width, containerSize.height);

        return (
          <DraggablePlayer
            key={player.name}
            player={player}
            playerSize={playerSize}
            initialLeft={left}
            initialTop={top}
          />
        );
      })}
    </div>
  );
};

export default PlayerContainer;
