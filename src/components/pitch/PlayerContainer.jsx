import React, { useEffect, useState, useRef, useContext } from 'react';
import { useDrop } from 'react-dnd';
import DraggablePlayer from './DraggablePlayer';
import { PlayersContext } from "../../utility/PlayersContext.jsx";

const mergeRefs = (...refs) => (el) => {
  refs.forEach((ref) => {
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  });
};

const getPlayerPosition = (player, playerSize, containerWidth, containerHeight) => {
  const halfSize = playerSize / 2;
  const maxWidth = containerWidth - halfSize;
  const maxHeight = containerHeight - halfSize;

  const left = Math.max(halfSize, Math.min(player.x * containerWidth, maxWidth));
  const top = Math.max(halfSize, Math.min(player.y * containerHeight, maxHeight));

  return { left, top };
};

const PlayerContainer = ({ team, teamPlayers, playerSize = 55 }) => {
  const containerRef = useRef(null);
  const { addRealPlayerToGame, switchToRealPlayer, switchToNewPlayer, updatePlayerPosition, switchTeam } = useContext(PlayersContext);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size on mount, resize, and whenever the container might change
  const updateContainerSize = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    // Initial size calculation
    updateContainerSize();

    // Listen for window resize events
    window.addEventListener('resize', updateContainerSize);

    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Observe container size changes (for sidebar toggle, etc.)
  useEffect(() => {
    const observer = new ResizeObserver(updateContainerSize);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      observer.disconnect();
    };
  }, []);

  // Handle movement of existing player within the container
  const handlePlayerMove = (playerId, newX, newY) => {
    if (updatePlayerPosition) {
      updatePlayerPosition(playerId, newX, newY);
    }
  };

  // Handle drop interactions
  const [, drop] = useDrop({
    accept: 'PLAYER',
    drop: (item, monitor) => {
      const dropOffset = monitor.getClientOffset();
      if (!containerRef.current || !dropOffset) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate drop position relative to container
      const dropX = (dropOffset.x - containerRect.left) / containerRect.width;
      const dropY = (dropOffset.y - containerRect.top) / containerRect.height;

      if ("uid" in item) {
        handleMainPlayerDrop(item.uid, dropX, dropY);
      } else {
        console.warn("Dropped item does not have a valid UID:", item);
      }

      // Return drop result to let the drag source know the drop was successful
      return { team };
    },
  });

  const handleMainPlayerDrop = (playerUID, dropX, dropY) => {
    addRealPlayerToGame(team, playerUID, dropX, dropY);
  };

  const handleSwitchPlayer = (playerId, newPlayer) => {
    switchToRealPlayer(team, playerId, newPlayer.id);
  };

  const handleSwitchToNewPlayer = (playerId, newPlayerName) => {
    switchToNewPlayer(team, playerId, newPlayerName, false);

  };

  const handleSwitchToNewGuest = (playerId, newPlayerName) => {
    switchToNewPlayer(team, playerId, newPlayerName, true);

  };

  // Combine refs for both drag and drop
  const combinedRef = mergeRefs(containerRef, drop);

  // Define base pitch styles
  const pitchColor = team === 'A'
    ? 'radial-gradient(ellipse at center, #3161a1, #1e3c61)'
    : 'radial-gradient(ellipse at center, #89db46, #4d7a27)';

  return (
    <div
      ref={combinedRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        background: pitchColor,
        boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Render players */}
      {teamPlayers.map((player) => {
        const { left, top } = getPlayerPosition(
          player,
          playerSize,
          containerSize.width,
          containerSize.height
        );

        return (
          <DraggablePlayer
            key={player.id}
            player={player}
            playerSize={playerSize}
            initialLeft={left}
            initialTop={top}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onPositionChange={handlePlayerMove}
            onSwitchPlayer={handleSwitchPlayer}
            onSwitchToGuest={handleSwitchToNewGuest}
            onAddAndSwitchToPlayer={handleSwitchToNewPlayer}
          />
        );
      })}
    </div>
  );
};

export default PlayerContainer;
