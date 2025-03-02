import { useState, useContext } from "react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";

const PlayerSelectionList = ({ players, selectedPlayers, togglePlayerSelection, setSelectedPlayers }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
  const filteredPlayers = sortedPlayers.filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const allSelected = filteredPlayers.length > 0 && filteredPlayers.every(player => selectedPlayers.has(player.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers.map(player => player.id)));
    }
  };

  return (
    <div className="flex flex-col w-full">
      <input
        type="text"
        placeholder="Search players..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2 w-full p-2 border rounded-md bg-gray-900 text-white"
      />
      {filteredPlayers.length > 0 && (
        <label className="flex items-center gap-2 cursor-pointer w-full mb-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="cursor-pointer"
          />
          Select All
        </label>
      )}
      <div className="max-h-48 overflow-y-auto border rounded-md p-2 w-full">
        {filteredPlayers.map((player) => (
          <label key={player.id} className="flex items-center gap-2 cursor-pointer w-full">
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
      {/* "Use Current Game" as a button */}
      <button
        onClick={() => {
          const newSelected = new Set(
            sortedPlayers.filter(player => player.team !== null && player.team !== "").map(player => player.id)
          );
          setSelectedPlayers(newSelected);
        }}
        className="w-full bg-gray-700 text-white py-2 rounded-md hover:bg-gray-600 transition-all mt-2"
      >
        Set To Current Game
      </button>
    </div>
  );
};

const ZoneWeightConfigurator = ({ zoneWeights, setZoneWeights }) => {
  const handleWeightChange = (zone, attribute, value) => {
    setZoneWeights(prev => ({
      ...prev,
      [zone]: { ...prev[zone], [attribute]: value }
    }));
  };

  return (
    <div className="flex flex-col w-full">
      <h3 className="text-white text-sm font-semibold mb-2">Zone Weight Configuration</h3>
      {Object.entries(zoneWeights).map(([zone, attributes]) => (
        <div key={zone} className="mb-4 p-2 bg-gray-700 rounded-md">
          <h4 className="text-white text-sm font-semibold">
            {zone === "0" ? "Defense" : zone === "1" ? "Midfield" : "Attack"}
          </h4>
          {["attack", "defense", "athleticism"].map(attr => (
            <div key={attr} className="flex justify-between items-center mb-2 w-full">
              <label className="text-white">{attr.charAt(0).toUpperCase() + attr.slice(1)}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={attributes[attr]}
                onChange={(e) => handleWeightChange(zone, attr, Number(e.target.value))}
                className="w-32"
              />
              <span className="text-white w-8 text-right">{attributes[attr]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const AutoTeamSelector = () => {
  const { players, generateTeams, rebalanceCurrentGame } = useContext(PlayersContext);
  const [zoneWeights, setZoneWeights] = useState({
    0: { attack: 10, defense: 100, athleticism: 30 },
    1: { attack: 60, defense: 30, athleticism: 50 },
    2: { attack: 100, defense: 0, athleticism: 40 }
  });

  const [selectedPlayers, setSelectedPlayers] = useState(
    new Set(players.filter(player => player.team).map(player => player.id))
  );

  const [activeTab, setActiveTab] = useState("players"); // "players" or "weighting"

  const togglePlayerSelection = (id) => {
    setSelectedPlayers(prevSelected => {
      const newSet = new Set(prevSelected);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleGenerateTeams = () => {
    const filteredPlayers = players.filter(p => selectedPlayers.has(p.id));
    generateTeams(filteredPlayers, zoneWeights);
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
    <div className="p-2 bg-gray-900 shadow-md rounded-lg text-white w-full max-h-[80vh] flex flex-col">

      {/* Tab Selector */}
      <div className="flex w-full border-b border-gray-700 mb-3">
        <button
          className={`flex-1 py-2 text-center font-semibold transition-all rounded-t-lg 
      ${activeTab === "players"
              ? "bg-gradient-to-r from-bg-gray-400 to-bg-gray-800 text-white shadow-md shadow-blue-500/50"
              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          onClick={() => setActiveTab("players")}
        >
          Players
        </button>

        <button
          className={`flex-1 py-2 text-center font-semibold transition-all rounded-t-lg 
      ${activeTab === "weighting"
              ? "bg-gradient-to-r from-bg-gray-400 to-bg-gray-800 text-white shadow-md shadow-blue-500/50"
              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          onClick={() => setActiveTab("weighting")}
        >
          Weighting
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow w-full overflow-y-auto">
        {activeTab === "players" ? (
          <PlayerSelectionList
            players={nonTempPlayers}
            selectedPlayers={selectedPlayers}
            togglePlayerSelection={togglePlayerSelection}
            setSelectedPlayers={setSelectedPlayers}
          />
        ) : (
          <ZoneWeightConfigurator zoneWeights={zoneWeights} setZoneWeights={setZoneWeights} />
        )}
      </div>

      {/* Generate Teams Button - Always at the Bottom */}
      <button
        onClick={handleGenerateTeams}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-all mt-3"
      >
        Auto Create Teams
      </button>
    </div>
  );
};

export default AutoTeamSelector;
