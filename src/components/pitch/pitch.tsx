import { useEffect, useState, useRef } from 'react';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { usePlayers } from "@/data/players-provider"
import { GamePlayer } from "@/data/player-types";

import DraggablePlayer from '@/components/pitch/pitch-player'

const mergeRefs = (...refs: (React.Ref<any> | null)[]) => (el: any) => {
  refs.forEach((ref) => {
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  });
};

interface PlayerContainerProps {
  team: string;
  teamPlayers: GamePlayer[];
  playerSize: number;
}

const getPlayerPosition = (player: GamePlayer, playerSize: number, containerWidth: number, containerHeight: number) => {
  const halfSize = playerSize / 2;
  const maxWidth = containerWidth - halfSize;
  const maxHeight = containerHeight - halfSize;

  // Position calculation using player.position.x and player.position.y
  const left = player.position
    ? Math.max(halfSize, Math.min(player.position.x * containerWidth, maxWidth))
    : 0;
  const top = player.position
    ? Math.max(halfSize, Math.min(player.position.y * containerHeight, maxHeight))
    : 0;

  return { left, top };
};

const PlayerContainer: React.FC<PlayerContainerProps> = ({ team, teamPlayers, playerSize = 55 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { players, addExisitingPlayerToGame, updateGamePlayerAttributes } = usePlayers();
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
  const handlePlayerMove = (player: GamePlayer, newX: number, newY: number) => {
    updateGamePlayerAttributes(player, { position: { x: newX, y: newY } });
  };

  // Handle drop interactions
  const [, drop] = useDrop({
    accept: 'PLAYER',
    drop: (item: GamePlayer, monitor: DropTargetMonitor) => {
      const dropOffset = monitor.getClientOffset();
      if (!containerRef.current || !dropOffset) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate drop position relative to container
      const dropX = (dropOffset.x - containerRect.left) / containerRect.width;
      const dropY = (dropOffset.y - containerRect.top) / containerRect.height;

      handleMainPlayerDrop(item, dropX, dropY);

      // Return drop result to let the drag source know the drop was successful
      return { team };
    },
  });

  const handleMainPlayerDrop = (player: GamePlayer, dropX: number, dropY: number) => {
    addExisitingPlayerToGame(player, team, dropX, dropY);
  };

  const findPlayerName = (player: GamePlayer) => {
    if (player.guest_name !== null) {
      return player.guest_name;
    } else {
      const realPlayer = players.find(searchPlayer => searchPlayer.id === player.id);
      if (realPlayer != null) return realPlayer.name;
    }
    return "[Player]"
  };

  // Combine refs for both drag and drop
  const combinedRef = mergeRefs(containerRef, drop as unknown as React.Ref<any>);


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
        background: pitchColor,
        boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.5)',
        overflow: 'visible',
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
            key={player.id || -1}
            player={player}
            name={findPlayerName(player)}
            playerSize={playerSize}
            initialLeft={left}
            initialTop={top}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onPositionChange={handlePlayerMove}
          />
        );
      })}
    </div>
  );
};

export default PlayerContainer;
