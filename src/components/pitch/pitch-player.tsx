import { useState } from "react";
import { useDrag } from "react-dnd";
import { User } from "lucide-react";
import { ScoredGamePlayerWithThreat } from "@/data/player-types";
import { usePlayers } from "@/context/players-provider";
// import Panel from "@/components/dialogs/panel"
import PlayerDialog from "@/components/dialogs/player-dialog";

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
  const { players } = usePlayers();

  // Get the full Player data (with avatar_url) from the players record
  const fullPlayer = player.id ? players[player.id] : null;

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

  const circleSize = Math.max(playerSize * 0.8, 40);
  const iconSize = circleSize * 0.4;
  const nameOffset = -(circleSize / 2);

  const halfCircle = circleSize / 2;
  const minLeft = halfCircle;
  const maxLeft = containerWidth - halfCircle;

  const minTop = halfCircle;
  const maxTop = containerHeight - halfCircle;

  // Split name into words by spaces
  const words = name.trim().split(/\s+/); // split on any whitespace, ignoring multiple spaces

  const maxLines = 3;
  // Number of lines = number of words (words.length)
  const numLines = Math.min(words.length, maxLines);

  const adjustedNameOffset = nameOffset - (numLines - 1) * 15;

  const clampedLeft = Math.min(Math.max(initialLeft, minLeft), maxLeft);
  const clampedTop = Math.min(Math.max(initialTop, minTop), maxTop);

  return (
    <div>
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
          left: `${clampedLeft}px`,
          top: `${clampedTop}px`,
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
          className={`z-200 rounded-full border-4 shadow-md flex items-center justify-center bg-muted overflow-hidden`}
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            borderColor: 'var(--color-muted-foreground)',
            fontSize: `${Math.max(circleSize * 0.4, 14)}px`,
          }}
        >
          <div>
            {fullPlayer?.avatar_url ? (
              <img
                src={fullPlayer.avatar_url}
                alt={name}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // Fallback to User icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <User size={iconSize} />
            )}
            {fullPlayer?.avatar_url && (
              <User size={iconSize} className="hidden" />
            )}
          </div>
        </div>
      </div>

      <PlayerDialog
        player={player}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
};

export default PitchPlayer;