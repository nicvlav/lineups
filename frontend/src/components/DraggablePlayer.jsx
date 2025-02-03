import React from 'react';

const DraggablePlayer = ({ player, playerSize, initialLeft, initialTop }) => {
  const handleDragStart = (e) => {
    // Store player name in dataTransfer object for use in the drop target
    
    e.dataTransfer.setData('playerName', player.name);
    
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        position: 'absolute',
        left: `${initialLeft}px`,
        top: `${initialTop}px`,
        width: `${playerSize}px`,
        height: `${playerSize}px`,
        backgroundColor: 'blue',
        cursor: 'pointer',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)', // Center the player
      }}
    >
      {player.name}
    </div>
  );
};

export default DraggablePlayer;
