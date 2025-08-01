import { useState } from "react";
import { useDrag } from "react-dnd";
import { User } from "lucide-react";
import { ScoredGamePlayerWithThreat, getThreatColor } from "@/data/player-types";
// import Panel from "@/components/dialogs/panel"
import PlayerDialog from "@/components/dialogs/player-dialog";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface PitchPlayerProps {
  player: ScoredGamePlayerWithThreat;
  name: string;
  playerSize: number;
  initialLeft: number;
  initialTop: number;
  containerWidth: number;
  containerHeight: number;
  onPositionChange?: (player: ScoredGamePlayerWithThreat, newX: number, newY: number) => void;
}

const PitchPlayer: React.FC<PitchPlayerProps> = ({
  player,
  name,
  playerSize,
  initialLeft,
  initialTop,
  containerWidth,
  containerHeight,
  onPositionChange,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getRelativePosition = (x: number, y: number) => ({
    x: Math.max(0, Math.min(1, x / containerWidth)),
    y: Math.max(0, Math.min(1, y / containerHeight)),
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: player,
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    end: (_, monitor) => {
      const dropResult = monitor.getDropResult();
      if (dropResult) return;

      const initialOffset = monitor.getInitialClientOffset();
      const currentOffset = monitor.getClientOffset();
      if (initialOffset && currentOffset) {
        const deltaX = currentOffset.x - initialOffset.x;
        const deltaY = currentOffset.y - initialOffset.y;
        const { x, y } = getRelativePosition(initialLeft + deltaX, initialTop + deltaY);
        onPositionChange?.(player, x, y);
      }
    },
  }), [player.id, initialLeft, initialTop, containerWidth, containerHeight]);

  const handleOpenDialog = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDialogOpen(true);
  };

  const circleSize = Math.max(playerSize * 0.8, 45);
  const iconSize = Math.max(circleSize * 0.4, 20);
  const nameOffset = -(circleSize / 2);

  // Split name into words by spaces
  const words = name.trim().split(/\s+/); // split on any whitespace, ignoring multiple spaces

  const maxLines = 3;
  // Number of lines = number of words (words.length)
  const numLines = Math.min(words.length, maxLines);

  const adjustedNameOffset = nameOffset - (numLines - 1) * 15;

  return (
    <HoverCard>
      <div
        ref={(node) => {
          if (node) drag(node);
        }}
        onContextMenu={handleOpenDialog}
        onDoubleClick={handleOpenDialog}
        className={`
          absolute flex flex-col items-center touch-none z-0
          transition-all duration-300
          ${isDragging ? "opacity-50" : "opacity-100"}
          cursor-grab
        `}
        style={{
          left: `${initialLeft}px`,
          top: `${initialTop}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`
    absolute text-white text-xs font-bold rounded-md  
    p pointer-events-none text-center flex flex-col
  `}
          style={{ top: `${adjustedNameOffset}px` }}
        >
          {name.split(" ").map((word, i) => (
            <span key={i} style={{ whiteSpace: "nowrap", marginBottom: "0.1em" }}>
              {word}
            </span>
          ))}
        </div>


        <div
          className={`z-200 rounded-full border-3 shadow-md flex items-center justify-center bg-muted`}
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            borderColor: getThreatColor(player.threatScore),
            // backgroundColor:" #4c7df0",
            fontSize: `${Math.max(circleSize * 0.4, 14)}px`,
          }}
        >
          <HoverCardTrigger>
            <User size={iconSize} />
          </HoverCardTrigger>
        </div>
      </div>

      <PlayerDialog
        player={player}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

      <HoverCardContent>
        {/* <div className="flex flex-col h-14 w-48 mx-auto">
          <Panel> */}
        <div>
          <span className="flex">Threat Score: {(player.threatScore * 100).toFixed(1)}% </span>
        </div>
        {/* </Panel>
        </div> */}
      </HoverCardContent>
    </HoverCard>
  );
};

export default PitchPlayer;