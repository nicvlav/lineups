import { useEffect, useState, useRef } from 'react';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { usePlayers } from "@/context/players-provider"
import { useGame } from "@/context/game-provider"
import { ScoredGamePlayerWithThreat } from "@/types/players";

import DraggablePlayer from '@/components/game/pitch/pitch-player'

const mergeRefs = (...refs: (React.Ref<any> | null)[]) => (el: any) => {
  refs.forEach((ref) => {
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  });
};

interface PlayerContainerProps {
  team: string;
  teamPlayers: ScoredGamePlayerWithThreat[];
  playerSize: number;
}

const getPlayerPosition = (player: ScoredGamePlayerWithThreat, playerSize: number, containerWidth: number, containerHeight: number) => {
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

const PlayerContainer: React.FC<PlayerContainerProps> = ({ team, teamPlayers, playerSize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { players } = usePlayers();
  const { addExisitingPlayerToGame, updateGamePlayerPosition } = useGame();
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
  const handlePlayerMove = (player: ScoredGamePlayerWithThreat, newX: number, newY: number) => {
    updateGamePlayerPosition(player, { x: newX, y: newY });
  };

  // Handle drop interactions
  const [, drop] = useDrop({
    accept: 'PLAYER',
    drop: (item: ScoredGamePlayerWithThreat, monitor: DropTargetMonitor) => {
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

  const handleMainPlayerDrop = (player: ScoredGamePlayerWithThreat, dropX: number, dropY: number) => {
    addExisitingPlayerToGame(player, team, dropX, dropY);
  };

  const findPlayerName = (player: ScoredGamePlayerWithThreat) => {
    if (player.guest_name !== null) {
      return player.guest_name;
    } else if (player.id in players) {
      return players[player.id].name;
    }
    return "[Player]"
  };

  // Combine refs for both drag and drop
  const combinedRef = mergeRefs(containerRef, drop as unknown as React.Ref<any>);


  // Define enhanced pitch styles with better contrast and differentiation
  const pitchColor = team === 'A'
    ? 'linear-gradient(135deg, hsl(200 100% 85%/0.15), hsl(200 100% 85%/0.08))' // Aqua blue tint - more contrast
    : 'linear-gradient(135deg, hsl(84 100% 70%/0.15), hsl(84 100% 70%/0.08))'; // Lime green tint - more contrast

  return (
    <div
      ref={combinedRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        background: pitchColor,
        border: '2px solid hsl(var(--border)/0.3)',
        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1)',
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
