import React, { useState, useEffect, useRef } from "react";

import { calculateNewPlayerPosition, updatePlayerPosition, updatePlayerInBackend } from "./../utils/movement"; // Import the utility

const Pitch = ({ players, setPlayers, padding, playerSize = 0.05 }) => {
  const [dragging, setDragging] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pitchSize, setPitchSize] = useState(0);
  const containerRef = useRef(null);

  // Pitch.jsx
  const handleMouseMove = (event) => {
    if (dragging && selectedPlayer) {
      if (event.type === 'touchmove') {
        event.preventDefault();

        if (event.touches > 0) {
          const newPos = calculateNewPlayerPosition(event.touches[0].clientX, event.touches[0].clientY, containerRef, selectedPlayer);

          // requestAnimationFrame(() => {
            setPlayers(updatePlayerPosition(players, selectedPlayer, newPos, playerSize));
          // });
        }
      } else {
        const newPos = calculateNewPlayerPosition(event.clientX, event.clientY, containerRef, selectedPlayer);
        setPlayers(updatePlayerPosition(players, selectedPlayer, newPos, playerSize));
      }


    }
  };

  // Handle mouse down to begin dragging
  const handleMouseDown = (event, player) => {
    if (event.type === 'touchstart') {
      event.preventDefault(); // Prevents page scroll during touch drag
    }

    setDragging(true);
    setSelectedPlayer(player);
  };

  // Handle mouse up to stop dragging and send the update to backend
  const handleMouseUp = (event) => {
    if (selectedPlayer) {
      if (event.type === 'touchend') {
        event.preventDefault(); // Prevents page scroll during touch drag
      } 

      updatePlayerInBackend(selectedPlayer.uid, { x: selectedPlayer.x, y: selectedPlayer.y });
    }
    setDragging(false);
    setSelectedPlayer(null);
  };

  // Resize pitch dynamically based on window size
  useEffect(() => {
    const handleResize = () => {
      const newSize = Math.min(window.innerWidth, window.innerHeight) - 2 * padding;
      setPitchSize(newSize);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [padding]);

  useEffect(() => {
    const container = containerRef.current;
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp);

    container.addEventListener("touchmove", handleMouseMove);
    container.addEventListener("touchend", handleMouseUp);
    container.addEventListener("touchcancel", handleMouseUp);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);
      container.removeEventListener("touchmove", handleMouseMove);
      container.removeEventListener("touchend", handleMouseUp);
      container.removeEventListener("touchcancel", handleMouseUp);
    };
  }, [dragging, selectedPlayer]);

  return (
    <div
      ref={containerRef}
      style={{
        width: pitchSize,
        height: pitchSize,
        position: "relative",
        border: "2px solid black",
        margin: `${padding}px`,
      }}
    >
      {players.map((player) => (
        <div
          key={player.name}
          onMouseDown={(e) => handleMouseDown(e, player)}
          onTouchStart={(e) => handleMouseDown(e, player)}
          style={{
            position: "absolute",
            left: `${player.x * 100}%`,
            top: `${player.y * 100}%`,
            width: `${playerSize * pitchSize}px`, // Dynamic width based on pitch size
            height: `${playerSize * pitchSize}px`, // Dynamic height based on pitch size
            backgroundColor: "blue",
            cursor: "pointer",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)", // Center the player based on its own center
          }}
        ></div>
      ))}
    </div>
  );
};

export default Pitch;