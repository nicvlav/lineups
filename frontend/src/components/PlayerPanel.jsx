import React, { useState } from 'react';

const PlayerPanel = ({ players }) => {
  return (
    <div className="player-panel">
      <h2>Active Players</h2>
      <ul>
        {players.map(player => (
          <li
            key={player.name}
            className="player-list-item"
          >
            {player.name}
          </li>
        ))}
      </ul>

    </div>
  );
};

export default PlayerPanel;
