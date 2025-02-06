import React, { useState, useContext, useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { PlayersContext } from "../global/PlayersContext";

const DraggablePlayer = ({ player, playerSize, initialLeft, initialTop }) => {
  const { findNameByUid } = useContext(PlayersContext);

  const name = findNameByUid(player.uid)

  const [, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { uid: player.uid },
  }));

  return (
    <div ref={drag}
      className="p-2  cursor-pointer relative bg-quaternary"
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
      {name}
    </div>
  );
};


export default DraggablePlayer;