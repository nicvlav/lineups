import { useState, useContext } from "react";
import { PlayersContext } from "../../global/PlayersContext.jsx";

const AutoTeamSelector = () => {
  const { players, generateTeams } = useContext(PlayersContext);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [weights, setWeights] = useState({ attack: 1, defense: 1, athleticism: 1 });

  const togglePlayerSelection = (id) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleGenerateTeams = () => {
    const filteredPlayers = players.filter((p) => selectedPlayers.includes(p.id));
    generateTeams(filteredPlayers, weights);
  };

  return (
    <div className="p-4 bg-black shadow-md rounded-lg">
      <h2 className="text-lg font-bold mb-3">Select Active Players</h2>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player) => (
          <label key={player.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedPlayers.includes(player.id)}
              onChange={() => togglePlayerSelection(player.id)}
            />
            {player.name}
          </label>
        ))}
      </div>
      <h3 className="mt-4 font-semibold">Attribute Weighting</h3>
      <div className="flex gap-2 mt-2">
        {Object.keys(weights).map((attr) => (
          <div key={attr} className="flex flex-col items-center">
            <label>{attr}</label>
            <input
              type="number"
              value={weights[attr]}
              onChange={(e) => setWeights({ ...weights, [attr]: Number(e.target.value) })}
              className="w-16 border rounded p-1"
            />
          </div>
        ))}
      </div>
      <button onClick={handleGenerateTeams} className="mt-4 w-full">
        Auto Create Teams
      </button>
    </div>
  );
};

export default AutoTeamSelector;
