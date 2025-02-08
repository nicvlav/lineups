import React, { useEffect, useState, useRef, useContext } from 'react';
import { useDrop } from 'react-dnd';
import DraggablePlayer from './DraggablePlayer';
import { PlayersContext } from "../global/PlayersContext";

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

const PlayerContainer = ({ team, players, playerSize = 50 }) => {
  const containerRef = useRef(null);
  const [playerList, setPlayerList] = useState(players);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { addPlayerToGame, updateGamePlayer } = useContext(PlayersContext);

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

  // useDrop hook to handle dropped players
  const [, drop] = useDrop(() => ({
    accept: 'PLAYER',
    drop: (item, monitor) => {
      if (!containerRef.current) return;

      const halfSize = playerSize / 2;

      const rect = containerRef.current.getBoundingClientRect();

      const { x, y } = monitor.getSourceClientOffset(); // Get the drop coordinates
      const dropX = (x - rect.left + halfSize) / rect.width;
      const dropY = (y - rect.top + halfSize) / rect.height;

      handleDrop(item.uid, dropX, dropY);
    },
  }));

  const handleDrop = (playerUID, dropX, dropY) => {
    if (players.find((p) => p.uid === playerUID)) {
      updateGamePlayer(team, playerUID, dropX, dropY);
      setPlayerList(updateGamePlayer(team, playerUID, dropX, dropY));
    } else {
      addPlayerToGame(team, playerUID, dropX, dropY);
    }
  };

  return (
    <div
      ref={mergeRefs(drop, containerRef)} // Attach useDrop hook to container
      className="relative bg-primary"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {playerList.map((player) => {
        const { left, top } = getPlayerPosition(player, playerSize, containerSize.width, containerSize.height);

        return (
          <DraggablePlayer
            key={player.base_player_uid}
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
