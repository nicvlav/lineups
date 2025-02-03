import React from 'react';

const DraggablePanelPlayer = ({ player, playerSize, initialLeft, initialTop }) => {
  const handleDragStart = (e) => {
    // Store player name in dataTransfer object for use in the drop target
    e.dataTransfer.setData('playerUID', String(player.uid));
    console.log(player);
    
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        cursor: 'pointer',
      }}
    >
      {player.name}
    </div>
  );
};

export default DraggablePanelPlayer;
