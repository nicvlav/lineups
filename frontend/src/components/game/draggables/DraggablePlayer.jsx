import React, { useState, useContext } from "react";
import { useDrag } from "react-dnd";
import PlayerIcon from "../../../assets/shirt.svg";

import PlayerDialog from "./PlayerDialog"; // New component for search dialog

const DraggablePlayer = ({ player, playerSize, initialLeft, initialTop, onSwitchPlayer, onSwitchToGuest, onAddAndSwitchToPlayer }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { game_uid: player.id, name: player.name},
  }));

  const handleOpenDialog = (event) => {
    event.preventDefault(); // Prevent default right-click behavior
    setIsDialogOpen(true);
  };

  return (
    <>
      <div
        ref={drag}
        className="cursor-pointer relative"
        style={{
          position: "absolute",
          left: `${initialLeft}px`,
          top: `${initialTop}px`,
          width: `${playerSize}px`,
          height: `${playerSize}px`,
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        onContextMenu={handleOpenDialog} // Right-click to open dialog
        onDoubleClick={handleOpenDialog} // Double-click to open dialog
      >
        <div
          style={{
            position: "absolute",
            top: "-20px",
            fontSize: "12px",
            fontWeight: "bold",
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}
        >
          {player.name}
        </div>

        <img
          src={PlayerIcon}
          alt={player.name}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
          }}
        />
      </div>

      {isDialogOpen && (
        <PlayerDialog
          player={player}
          onClose={() => setIsDialogOpen(false)}
          onSelectExistingPlayer={onSwitchPlayer}
          onSelectGuestPlayer={onSwitchToGuest}
          onAddAndSelectNewPlayer={onAddAndSwitchToPlayer}
        />
      )}
    </>
  );
};

export default DraggablePlayer;
