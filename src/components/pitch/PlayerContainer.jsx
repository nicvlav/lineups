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

const PlayerContainer = ({ team, teamPlayers }) => {
  const containerRef = useRef(null);

  const { addRealPlayerToGame, switchToRealPlayer, switchToNewPlayer } = useContext(PlayersContext);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [playerSize, setPlayerSize] = useState(80);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize(); // Initial size calculation

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 🔥 New Effect: Also trigger size update when sidebar toggles
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef.current]);

  // useDrop hook to handle dropped players
  const [, drop] = useDrop(() => ({
    accept: 'PLAYER',
    drop: (item, monitor) => {
      if (!containerRef.current) return;

      console.log("drop:", { item });

      const halfSize = playerSize / 2;
      const rect = containerRef.current.getBoundingClientRect();
      const { x, y } = monitor.getSourceClientOffset(); // Get the drop coordinates
      const dropX = (x - rect.left + halfSize) / rect.width;
      const dropY = (y - rect.top + halfSize) / rect.height;

      if ("player_uid" in item) {
        handleMainPlayerDrop(item.player_uid, dropX, dropY);
      } else if ("game_uid" in item) {
        handleGamePlayerDrop(item.game_uid, dropX, dropY);
      } else {
        console.warn("Dropped item does not have a valid UID:", item);
      }
    },
  }));

  const handleMainPlayerDrop = (playerUID, dropX, dropY) => {
    addRealPlayerToGame(team, playerUID, dropX, dropY);
  };

  const handleGamePlayerDrop = (gamePlayerUID, dropX, dropY) => {
    addRealPlayerToGame(team, gamePlayerUID, dropX, dropY);

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



  return (
    <div
      ref={mergeRefs(drop, containerRef)} // Attach useDrop hook to container
      // className="relative bg-primary"
      className={`soccer-pitch-${team} p-4 bg-gray-900 rounded-lg shadow-lg flex gap-4`}
    >
      {teamPlayers.map((player) => {
        const { left, top } = getPlayerPosition(player, playerSize, containerSize.width, containerSize.height);

        return (
          <DraggablePlayer
            key={player.id}
            player={player}
            playerSize={80}
            initialLeft={left}
            initialTop={top}

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
