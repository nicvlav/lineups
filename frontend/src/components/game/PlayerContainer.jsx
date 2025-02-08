import React, { useEffect, useState, useRef, useContext } from 'react';
import { useDrop } from 'react-dnd';
import DraggablePlayer from './DraggablePlayer';
import { PlayersContext } from "../global/PlayersContext.jsx";

const mergeRefs = (...refs) => (el) => {
  refs.forEach((ref) => {
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  });
};

const getPlayerPosition = (player, playerSize, containerWidth, containerHeight) => {
  const halfSize = playerSize / 2;
  const maxWidth = containerWidth - halfSize;
  const maxHeight = containerHeight - halfSize;

  const left = Math.max(halfSize, Math.min(player.x * containerWidth, maxWidth));
  const top = Math.max(halfSize, Math.min(player.y * containerHeight, maxHeight));

  return { left, top };
};

const PlayerContainer = ({ team }) => {
  const containerRef = useRef(null);

  const { addGamePlayerToGame, addRealPlayerToGame, updateGamePlayer, getTeamPlayers, switchGamePlayer, switchGamePlayerToGuest, addAndSwitchGamePlayer } = useContext(PlayersContext);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [playerSize, setPlayerSize] = useState(80);
  const [players, setPlayers] = useState(getTeamPlayers(team));

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize(); // Initial size calculation

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // useDrop hook to handle dropped players
  const [, drop] = useDrop(() => ({
    accept: 'PLAYER',
    drop: (item, monitor) => {
      if (!containerRef.current) return;

      const halfSize = playerSize / 2;
      const rect = containerRef.current.getBoundingClientRect();
      const { x, y } = monitor.getSourceClientOffset(); // Get the drop coordinates
      const dropX = (x - rect.left + halfSize) / rect.width;
      const dropY = (y - rect.top + halfSize) / rect.height;

      if ("player_uid" in item) {
        handleMainPlayerDrop(item.player_uid, dropX, dropY);
      } else if ("game_uid" in item) {
        handleGamePlayerDrop(item.game_uid, dropX, dropY);
      } else {
        console.warn("Dropped item does not have a valid UID:", item);
      }
    },
  }));

  const handleMainPlayerDrop = (playerUID, dropX, dropY) => {
    const gamePlayer = players.find((p) => p.base_player_uid === playerUID);
    if (gamePlayer) {
      updateGamePlayer(team, gamePlayer, dropX, dropY);
      setPlayers((prevPlayers) => {
        return prevPlayers.map((p) =>
          p.base_player_uid === playerUID
            ? { ...p, x: dropX, y: dropY } // Update position
            : p
        );
      });
    } else {
      addRealPlayerToGame(team, playerUID, dropX, dropY);
      setPlayers(getTeamPlayers(team)); // Refresh player list
    }
  };

  const handleGamePlayerDrop = (gamePlayerUID, dropX, dropY) => {
    const gamePlayer = players.find((p) => p.id === gamePlayerUID);
    if (gamePlayer) {
      updateGamePlayer(team, gamePlayer, dropX, dropY);
      setPlayers((prevPlayers) => {
        return prevPlayers.map((p) =>
          p.id === gamePlayerUID
            ? { ...p, x: dropX, y: dropY } // Update position
            : p
        );
      });
    } else {
      addGamePlayerToGame(team, gamePlayerUID, dropX, dropY);
      setPlayers(getTeamPlayers(team)); // Refresh player list
    }
  };

  const handleSwitchPlayer = (playerId, newPlayer) => {
    switchGamePlayer(team, playerId, newPlayer.uid);
    setPlayers(getTeamPlayers(team)); // Refresh player list
    // setGamePlayers((prev) =>
    //   prev.map((p) => (p.id === playerId ? { ...p, ...newPlayer } : p))
    // );
  };

  const handleSwitchPlayerToGuest = (playerId, newPlayerName) => {
    switchGamePlayerToGuest(team, playerId, newPlayerName);
    // setPlayers(getTeamPlayers(team)); // Refresh player list
    // setGamePlayers((prev) =>
    //   prev.map((p) => (p.id === playerId ? { ...p, ...newPlayer } : p))
    // );
  };

  const handleAddAndSwitchPlayerToGuest = (playerId, newPlayerName) => {
    addAndSwitchGamePlayer(team, playerId, newPlayerName);
    // setPlayers(getTeamPlayers(team)); // Refresh player list
    // setGamePlayers((prev) =>
    //   prev.map((p) => (p.id === playerId ? { ...p, ...newPlayer } : p))
    // );
  };

  return (
    <div
      ref={mergeRefs(drop, containerRef)} // Attach useDrop hook to container
      className="relative bg-primary"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {players.map((player) => {
        const { left, top } = getPlayerPosition(player, playerSize, containerSize.width, containerSize.height);

        return (
          <DraggablePlayer
            key={player.id}
            player={player}
            playerSize={80}
            initialLeft={left}
            initialTop={top}

            onSwitchPlayer={handleSwitchPlayer}
            onSwitchToGuest={handleSwitchPlayerToGuest}
            onAddAndSwitchToPlayer={handleAddAndSwitchPlayerToGuest}
          />
        );
      })}
    </div>
  );
};

export default PlayerContainer;
