import React from 'react';
import { useDrag } from "react-dnd";

const DraggablePlayer = ({ player,  playerSize, initialLeft, initialTop }) => {
  const [, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { uid: player.uid },
  }));

  return (
    <div ref={drag}
      className="p-2  cursor-pointer relative bg-tertiary"
      style={{
        position: 'absolute',
        left: `${initialLeft}px`,
        top: `${initialTop}px`,
        width: `${playerSize}px`,
        height: `${playerSize}px`,
        // backgroundColor: 'blue',
        cursor: 'pointer',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)', // Center the player
      }}>
      {/* {player.uid} */}
    </div>
  );
};


export default DraggablePlayer;