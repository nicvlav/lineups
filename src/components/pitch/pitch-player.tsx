import { useState } from "react";
import { useDrag } from "react-dnd";
import { User } from "lucide-react";
import { GamePlayer } from "@/data/player-types";
import PlayerDialog from "@/components/dialogs/player-dialog";

interface PitchPlayerProps {
  player: GamePlayer;
  name: string,
  playerSize: number;
  initialLeft: number;
  initialTop: number;
  containerWidth: number;
  containerHeight: number;
  onPositionChange?: (player: GamePlayer, newX: number, newY: number) => void;
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

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: player ,
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    end: (_, monitor) => {
      const dropResult = monitor.getDropResult();
      const didDrop = monitor.didDrop();

      if (didDrop && dropResult) return;

      if (!didDrop && monitor.getItemType() === "PLAYER") {
        const initialOffset = monitor.getInitialClientOffset();
        const currentOffset = monitor.getClientOffset();

        if (initialOffset && currentOffset && containerWidth && containerHeight) {
          const deltaX = currentOffset.x - initialOffset.x;
          const deltaY = currentOffset.y - initialOffset.y;

          const newX = Math.max(0, Math.min(1, (initialLeft + deltaX) / containerWidth));
          const newY = Math.max(0, Math.min(1, (initialTop + deltaY) / containerHeight));

          onPositionChange?.(player, newX, newY);
        }
      }
    },
  }), [player.id, player.team, initialLeft, initialTop, containerWidth, containerHeight, onPositionChange]);

  const handleOpenDialog = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDialogOpen(true);
  };

  const circleSize = Math.max(playerSize * 0.8, 40);

  const playerStyle: React.CSSProperties = {
    position: "absolute",
    left: `${initialLeft}px`,
    top: `${initialTop}px`,
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    zIndex: 5,
    transition: isDragging ? "none" : "left 0.3s ease, top 0.3s ease",
    touchAction: "none",
  };

  const circleStyle: React.CSSProperties = {
    width: `${circleSize}px`,
    height: `${circleSize}px`,
    borderRadius: "50%",
    backgroundColor: "#4c7df0",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
    border: "2px solid white",
    fontSize: `${Math.max(circleSize * 0.4, 14)}px`,
  };

  const nameStyle: React.CSSProperties = {
    position: "absolute",
    top: `-${circleSize / 2 + 8}px`,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    textAlign: "center",
    zIndex: 1000,
  };


  return (
    <>
      <div ref={(node) => {
        if (node) drag(node);
      }}
        style={playerStyle}
        onContextMenu={handleOpenDialog}
        onDoubleClick={handleOpenDialog}>
        <div style={nameStyle}>{name}</div>
        <div style={circleStyle}>{<User size={Math.max(circleSize * 0.4, 20)} />}</div>
      </div>
      <PlayerDialog
        player={player}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export default PitchPlayer;
