import { useDrag } from "react-dnd";
import DraggablePlayer from './DraggablePanelPlayer';

const PlayerPanel = ({ players }) => {
  return (
    <div
      className="relative bg-tertiary"
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        padding: "10px",
      }}
    >
      {players.length > 0 ? (
        players.map((player) => <DraggablePlayer key={player.id} player={player} />)
      ) : (
        <p>No players available</p>
      )}
    </div>
  );
};

export default PlayerPanel;
