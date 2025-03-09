import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { User } from "lucide-react";
import PlayerDialog from "./PlayerDialog";

import { isMobile } from "react-device-detect"; // Detect touch devices

const DraggablePlayer = ({ 
  player, 
  playerSize, 
  initialLeft, 
  initialTop, 
  containerWidth,
  containerHeight,
  onPositionChange,
  onSwitchPlayer, 
  onSwitchToGuest, 
  onAddAndSwitchToPlayer 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Set up drag functionality with drag position tracking
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { 
      uid: player.id, 
      name: player.name,
      team: player.team // Include team information
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // Handle the end of drag - update player position
      const dropResult = monitor.getDropResult();
      const didDrop = monitor.didDrop();
      
      // If dropped somewhere valid
      if (didDrop && dropResult) {
        return; // The drop handler in the container will handle it
      }
      
      // If dragged within the same container but not handled by the drop handler
      if (!didDrop && monitor.getItemType() === 'PLAYER') {
        const initialOffset = monitor.getInitialClientOffset();
        const currentOffset = monitor.getClientOffset();
        
        if (initialOffset && currentOffset && containerWidth && containerHeight) {
          // Calculate the new position
          const deltaX = currentOffset.x - initialOffset.x;
          const deltaY = currentOffset.y - initialOffset.y;
          
          // Calculate the new relative position
          const newX = Math.max(0, Math.min(1, (initialLeft + deltaX) / containerWidth));
          const newY = Math.max(0, Math.min(1, (initialTop + deltaY) / containerHeight));
          
          // Update the player position in the context
          if (onPositionChange) {
            onPositionChange(player.id, newX, newY);
          }
        }
      }
    },
  }), [player.id, player.team, initialLeft, initialTop, containerWidth, containerHeight, onPositionChange]);

  const handleOpenDialog = (event) => {
    event.preventDefault(); // Prevent default right-click behavior
    setIsDialogOpen(true);
  };

  // Calculate size for player circle
  const circleSize = Math.max(playerSize * 0.8, 40);

  // Player style
  const playerStyle = {
    position: 'absolute',
    left: `${initialLeft}px`,
    top: `${initialTop}px`,
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    zIndex: 10,
    // Add transition for smooth movement if position changes, but not during drag
    transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
    // Ensure touch devices work correctly
    touchAction: 'none'
  };

  // Player circle style - color based on role or other characteristics
  const getPlayerColor = () => {
    // Here you could assign colors based on roles, attributes, or other factors
    return '#4c7df0'; // Default blue color
  };

  const circleStyle = {
    width: `${circleSize}px`,
    height: `${circleSize}px`,
    borderRadius: '50%',
    backgroundColor: getPlayerColor(),
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    border: '2px solid white',
    fontSize: `${Math.max(circleSize * 0.4, 14)}px`
  };

  // Player name label style
  const nameStyle = {
    position: 'absolute',
    top: `-${circleSize / 2 + 8}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    textAlign: 'center',
    zIndex: 10,
  };

  return (
    <>
      <div
        ref={drag}
        style={playerStyle}
        onContextMenu={handleOpenDialog}
        onDoubleClick={handleOpenDialog}
      >
        <div style={nameStyle}>
          {player.name}
        </div>
        <div style={circleStyle}>
          {player.number || <User size={Math.max(circleSize * 0.4, 20)} />}
        </div>
      </div>

      {isDialogOpen && (
        <PlayerDialog
          player={player}
          onClose={() => setIsDialogOpen(false)}
          onSelectExistingPlayer={onSwitchPlayer}
          onSelectGuestPlayer={onSwitchToGuest}
          onAddAndSelectNewPlayer={onAddAndSwitchToPlayer}
        />
      )}
    </>
  );
};

export default DraggablePlayer;
