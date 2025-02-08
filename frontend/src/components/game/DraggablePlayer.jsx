import React, { useContext } from "react";
import { useDrag } from "react-dnd";
import PlayerIcon from "../../assets/shirt.svg"; // Import SVG file

const DraggablePlayer = ({ player, playerSize, initialLeft, initialTop }) => {
  const [, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { game_uid: player.id },
  }));

  return (
    <div
      ref={drag}
      className="cursor-pointer relative"
      style={{
        position: "absolute",
        left: `${initialLeft}px`,
        top: `${initialTop}px`,
        width: `${playerSize}px`,
        height: `${playerSize}px`,
        transform: "translate(-50%, -50%)", // Center the player
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Name above the player icon */}
      <div
        style={{
          position: "absolute",
          top: "-20px", // Adjust distance above the icon
          fontSize: "12px",
          fontWeight: "bold",
          background: "rgba(0, 0, 0, 0.7)", // Optional: Background for readability
          color: "white",
          padding: "2px 6px",
          borderRadius: "4px",
          whiteSpace: "nowrap",
        }}
      >
        {player.name}
      </div>

      {/* Player Icon */}
      <img
        src={PlayerIcon}
        alt={player.name}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%", // Keep circular shape
        }}
      />
    </div>
  );
};

export default DraggablePlayer;
