// components/Player.jsx
import React from 'react';

const Player = ({ player, containerWidth, containerHeight, boxSize, onMouseDown }) => {
  const { name, x, y } = player;

  // Ensure x and y are within the range [0, 1] and are numbers
  const normalizedX = isNaN(x) ? 0 : Math.max(0, Math.min(1, x));
  const normalizedY = isNaN(y) ? 0 : Math.max(0, Math.min(1, y));

  // Calculate the player position based on container size or box size
  const playerX = normalizedX * containerWidth; // Scale to container width
  const playerY = normalizedY * containerHeight; // Scale to container height

  // Optionally, use custom box size (e.g., 50px by 50px square)
  const playerSize = boxSize || 50; // Default size is 50px

//   console.log(x);

  return (
    <div
      className="player"
      style={{
        position: 'absolute',
        left: `${playerX - playerSize / 2}px`, // Center player based on its size
        top: `${playerY - playerSize / 2}px`,  // Center player based on its size
        width: `${playerSize}px`,
        height: `${playerSize}px`,
        borderRadius: '50%',
        backgroundColor: 'blue',
        cursor: 'pointer',
      }}
      onMouseDown={(e) => onMouseDown(e, player)}
    >
      <span style={{ color: 'white', textAlign: 'center', display: 'block' }}>{name}</span>
    </div>
  );
};

export default Player;
