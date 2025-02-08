import React, { useState } from "react";
import { createPortal } from "react-dom";

const PlayerDialog = ({ player, players, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-brown p-4 rounded shadow-lg w-80">
        <h2 className="text-lg font-bold mb-2">Switch Player {player.name} </h2>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded mb-2"
          placeholder="Search player..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className="max-h-40 overflow-y-auto">
          {filteredPlayers.map((p) => (
            <li
              key={p.id}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => {
                onSelect(player.id, p);
                onClose();
              }}
            >
              {p.name}
            </li>
          ))}
        </ul>
        <button className="mt-2 w-full bg-red-500 text-white p-2 rounded" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>,
    document.body // 🔥 Mounts the dialog at the body level
  );
};

export default PlayerDialog;
