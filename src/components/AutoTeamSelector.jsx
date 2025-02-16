import { useState, useContext } from "react";
import { PlayersContext } from "../utility/PlayersContext.jsx";

const PlayerSelectionList = ({ players, selectedPlayers, togglePlayerSelection }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="transition-all duration-300 overflow-hidden">
      <input
        type="text"
        placeholder="Search players..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2 w-full p-2 border rounded-md bg-gray-900 text-white"
      />
      <div className="max-h-48 overflow-y-auto border rounded-md p-2">
        {filteredPlayers.map((player) => (
          <label key={player.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedPlayers.has(player.id)}
              onChange={() => togglePlayerSelection(player.id)}
              className="cursor-pointer"
            />
            {player.name}
          </label>
        ))}
      </div>
    </div>
  );
};

const WeightingSelector = ({ weights, setWeights }) => {
  const handleWeightChange = (attribute, value) => {
    setWeights(prev => ({ ...prev, [attribute]: value }));
  };

  return (
    <div className="mb-4 p-3 bg-gray-800 rounded-lg ">
      <h3 className="text-white text-sm font-semibold mb-2">Weighting Preferences</h3>
      {["attack", "defense", "athleticism"].map(attr => (
        <div key={attr} className="flex justify-between items-center mb-2">
          <label className="text-white">{attr.charAt(0).toUpperCase() + attr.slice(1)}</label>
          <input
            type="range"
            min="1"
            max="20"
            value={weights[attr]}
            onChange={(e) => handleWeightChange(attr, Number(e.target.value))}
            className="w-24"
          />
          <span className="text-white">{weights[attr]}</span>
        </div>
      ))}
    </div>
  );
};

const AutoTeamSelector = () => {
  const { players, generateTeams, rebalanceCurrentGame } = useContext(PlayersContext);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [weights, setWeights] = useState({ attack: 10, defense: 10, athleticism: 10 });
  const [useCurrentGame, setUseCurrentGame] = useState(true);

  const togglePlayerSelection = (id) => {
    setSelectedPlayers(prevSelected => {
      const newSet = new Set(prevSelected);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return new Set(newSet);
    });
  };

  const handleGenerateTeams = () => {
    if (useCurrentGame) {
      rebalanceCurrentGame(weights);
    } else {
      const filteredPlayers = players.filter(p => selectedPlayers.has(p.id));
      generateTeams(filteredPlayers, weights);
    }
  };

  const getNonTemps = () => {
    if (!players || !Array.isArray(players)) {
      console.warn("Invalid players format:", players);
      return [];
    }
    return players.filter(player => player.temp_formation !== true);
  };

  const nonTempPlayers = getNonTemps();


  return (
    <div className="p-4 bg-gray-900 shadow-md rounded-lg text-white max-h-[65vh] overflow-y-auto">
      <h2 className="text-lg font-bold mb-3">Auto Team Selection</h2>

      {/* Toggle for "Use Current Game" */}
      <button
        onClick={() => setUseCurrentGame(prev => !prev)}
        className={`mb-3 w-full py-2 rounded-md transition-colors 
        ${useCurrentGame ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-800"}`}
      >
        {useCurrentGame ? "Using Current Game" : "Select Players Manually"}
      </button>

      {/* Show player selection only if not using current game */}
      {!useCurrentGame && (
        <PlayerSelectionList
          players={nonTempPlayers}
          selectedPlayers={selectedPlayers}
          togglePlayerSelection={togglePlayerSelection}
        />
      )}

      {/* Weighting Slider Component */}
      <WeightingSelector weights={weights} setWeights={setWeights} />

      {/* Generate Teams Button */}
      <button
        onClick={handleGenerateTeams}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-all"
      >
        Auto Create Teams
      </button>
    </div>
  );
};

export default AutoTeamSelector;
