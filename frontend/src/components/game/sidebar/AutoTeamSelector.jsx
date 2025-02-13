import { useState, useContext, useEffect } from "react";
import { PlayersContext } from "../../global/PlayersContext.jsx";

const AutoTeamSelector = () => {
  const { players, generateTeams } = useContext(PlayersContext);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set()); // Use Set for better state management
  const [weights, setWeights] = useState({ attack: 1, defense: 1, athleticism: 1 });

  // useEffect(() => {
  //   console.log("Selected Players:", Array.from(selectedPlayers));
  // }, [selectedPlayers]);

  const togglePlayerSelection = (id) => {
    setSelectedPlayers((prevSelected) => {
      const newSet = new Set(prevSelected);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return new Set(newSet); // Ensure React detects state change
    });
  };

  const handleGenerateTeams = () => {
    const filteredPlayers = players.filter((p) => selectedPlayers.has(p.id));
    generateTeams(filteredPlayers, weights);
  };

  return (
    <div className="p-4 bg-black shadow-md rounded-lg">
      <h2 className="text-lg font-bold mb-3">Select Active Players</h2>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player) => (
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

      <button
        onClick={handleGenerateTeams}
        className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
      >
        Auto Create Teams
      </button>
    </div>
  );
};

export default AutoTeamSelector;
