export const calculateNewPlayerPosition = (event, containerRef, selectedPlayer) => {
    const boundingRect = containerRef.current.getBoundingClientRect();
    const newX = (event.clientX - boundingRect.left) / boundingRect.width; // Normalize to 0-1
    const newY = (event.clientY - boundingRect.top) / boundingRect.height; // Normalize to 0-1
    
    return { x: newX, y: newY };
  };
  
  export const updatePlayerPosition = (players, selectedPlayer, newPos) => {
    return players.map(player =>
      player.name === selectedPlayer.name
        ? { ...player, x: newPos.x, y: newPos.y }
        : player
    );
  };