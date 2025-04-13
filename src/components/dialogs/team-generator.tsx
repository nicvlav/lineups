import { useState, useEffect } from "react";
import { usePlayers } from "@/data/players-provider";
import { attributeLabels, attributeColors, weightingLabels, Weighting } from "@/data/attribute-types";
import { Player  } from "@/data/player-types";
import { Users, Dumbbell, Wand2, Check, RotateCcw, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Panel from "@/components/dialogs/panel"

import {
    Card,
    CardContent,
    CardDescription,
    // CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface TeamGeneratorProps {
    width: number;
}

// Main component with tabs
const TeamGenerator: React.FC<TeamGeneratorProps> = ({ width }) => {
    const [activeTab, setActiveTab] = useState("generation");
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const {
        players,
        gamePlayers,
        generateTeams,
        zoneWeights,
        setZoneWeights,
        resetToDefaultWeights
    } = usePlayers();
    const navigate = useNavigate();

    // Get non-temporary players and initialize selected players
    useEffect(() => {
        handlePlayersUpdated();
    }, [players]);

    useEffect(() => {
        handlePlayersUpdated();
    }, []);


    const handlePlayersUpdated = () => {
        if (players && Array.isArray(players)) {
            setSelectedPlayers(players.filter(realPlayer =>
                gamePlayers.some(gamePlayer => gamePlayer.id == realPlayer.id)
            ).map((player) => player.id));
        }
    };

    // Generate teams with selected players and weights
    const handleGenerateTeams = async () => {
        if (selectedPlayers.length < 2) {
            console.warn("Need at least 2 players to form teams");
            return;
        }

        const selectedPlayerObjects = players.filter(
            player => selectedPlayers.includes(player.id)
        );

        // Pass both selectedPlayerObjects and zoneWeights
        generateTeams(selectedPlayerObjects);

        navigate("/");
    };

    const canGenerate = selectedPlayers.length >= 10 && selectedPlayers.length <= 24;
    const isSmallScreen = width < 768; // You can customize this to match your breakpoint

    return (
        <div className="flex-1 min-h-0 flex flex-col w-full h-full border">
            <div className="min-h-0 flex flex-col h-full border">

                {isSmallScreen && (
                     <div className="min-h-0 flex flex-col h-full border">
                        <div className="flex gap-2 w-full max-h-[40px] p-4">
                            <button
                                className={`flex-1 flex items-center justify-center p-2  transition-all duration-200 ${activeTab === "generation" ? " text-blue-600 shadow-sm" : ""}`}
                                onClick={() => setActiveTab("generation")}
                            >
                                <Users size={16} className="mr-2" />

                            </button>
                            <button
                                className={`flex-1 flex items-center justify-center p-2  transition-all duration-200 ${activeTab === "weighting" ? " text-blue-600 shadow-sm" : ""}`}
                                onClick={() => setActiveTab("weighting")}
                            >
                                <Dumbbell size={16} className="mr-2" />

                            </button>
                        </div>
                        <div className="min-h-0 w-full flex h-full border">
                            {activeTab === "generation" ? (
                                <TeamGenerationTab
                                    players={players}
                                    selectedPlayers={selectedPlayers}
                                    setSelectedPlayers={setSelectedPlayers}
                                />
                            ) : (
                                <WeightingTab
                                    zoneWeights={zoneWeights}
                                    setZoneWeights={setZoneWeights}
                                    resetZoneWeights={resetToDefaultWeights}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Layout for large screens (side by side) */}
                {!isSmallScreen && (
                    <div className="min-h-0 flex h-full border">
                        {/* First Div */}
                        <TeamGenerationTab
                            players={players}
                            selectedPlayers={selectedPlayers}
                            setSelectedPlayers={setSelectedPlayers}
                        />


                        <WeightingTab
                            zoneWeights={zoneWeights}
                            setZoneWeights={setZoneWeights}
                            resetZoneWeights={resetToDefaultWeights}
                        />

                    </div>
                )}


                {/* Generate Button - Fixed at Bottom */}
                <div className="flex-1">
                    <button
                        onClick={handleGenerateTeams}
                        disabled={!canGenerate}
                        className={`flex items-center justify-center w-full h-[40px] mb-1 rounded-lg font-medium transition-all duration-200 ${canGenerate ? 'bg-green-600 text-white cursor-pointer' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                    >
                        <Wand2 size={18} className="mr-2" />
                        <span>Generate Two Teams</span>
                    </button>
                </div>
            </div>
        </div>

    );
};

interface TeamGenerationTabProps {
    players: Player[];
    selectedPlayers: string[];
    setSelectedPlayers: React.Dispatch<React.SetStateAction<string[]>>;
}

// Team Generation Tab
const TeamGenerationTab: React.FC<TeamGenerationTabProps> = ({ players, selectedPlayers, setSelectedPlayers }) => {
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Filter players based on search
    const filteredPlayers = players.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    // Toggle all players selection
    const toggleAll = () => {
        if (selectedPlayers.length === players.length) {
            setSelectedPlayers([]);
        } else {
            setSelectedPlayers(players.map(p => p.id));
        }
    };

    // Toggle individual player selection
    const togglePlayer = (playerId: string) => {
        if (selectedPlayers.includes(playerId)) {
            setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
        } else {
            setSelectedPlayers([...selectedPlayers, playerId]);
        }
    };

    return (
        <div className=" h-full flex-1 min-h-0 flex flex-col border p-4">
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
                {/* Search and Toggle Controls */}
                <div className="p-3 border-b bg-accent h-[60px]">
                    <div className="flex items-center gap-3 ">
                        {/* Search Input */}
                        <div className="flex  items-center flex-1 borderrounded-xl p-2 transition-all">
                            <Search size={20} className=" mr-3" />
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-none outline-none  text-sm"
                            />
                        </div>

                        {/* Select/Deselect All Button */}
                        <button
                            onClick={toggleAll}
                            className="bg-background flex items-center px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all whitespace-nowrap"
                        >
                            {selectedPlayers.length === players.length ? "Deselect All" : "Select All"}
                        </button>
                    </div>
                </div>

                {/* Selected count info with icon */}

                <Panel>
                    {/* Player List - Modern Cards */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Players</CardTitle>
                            <CardDescription>
                                <div className="flex-1 w-full flex items-center gap-2 text-sm">
                                    <Users size={16} className="text-white" />
                                    <span>
                                        Selected {selectedPlayers.length} of {players.length} players
                                        {!(selectedPlayers.length >= 10 && selectedPlayers.length <= 24) && (
                                            <span className="text-red-500 ml-1 flex items-center gap-1">
                                                • Need between 10 and 24 players (inclusive)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {sortedPlayers.length > 0 ? (
                                    sortedPlayers.map(player => (
                                        <div
                                            key={player.id}
                                            className={`flex items-center break-words truncate whitespace-normal rounded-xl transition-transform duration-200 cursor-pointer gap-3 
        ${selectedPlayers.includes(player.id) ? 'bg-white/25' : ''} `}
                                            onClick={() => togglePlayer(player.id)}
                                        >

                                            {/* Checkbox */}
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPlayers.includes(player.id)}
                                                    onChange={() => togglePlayer(player.id)}
                                                    className="w-4 h-4 cursor-pointer accent-blue-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>


                                            <span
                                                className="break-words whitespace-normal w-full"
                                                title={player.name}
                                            >
                                                {player.name}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center rounded-xl mt-3">
                                        No players match your search
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </Panel>
            </div>
        </div>
    );
};
interface WeightingTabProps {
    zoneWeights: Weighting;
    setZoneWeights: (weights: Weighting) => void;
    resetZoneWeights: () => void;
}

// Weighting Tab
const WeightingTab: React.FC<WeightingTabProps> = ({ zoneWeights, setZoneWeights, resetZoneWeights }) => {
    // Function to update a specific weight
    const updateZoneWeight = (zone: number, position: number, attribute: number, value: number) => {
        // Clamp value between 0 and 100
        const newValue = Math.max(0, Math.min(100, value));

        // Create a new copy of the previous weightings
        const updatedWeights: Weighting = structuredClone(zoneWeights); // Deep copy ensures immutability

        updatedWeights[zone][position].weighting[attribute] = newValue;

        setZoneWeights(updatedWeights);
    };

    // Helper to adjust weight by a given amount
    const adjustWeight = (zone: number, position: number, attribute: number, adjustment: number) => {
        const currentValue = zoneWeights[zone][position].weighting[attribute];
        updateZoneWeight(zone, position, attribute, currentValue + adjustment);
    };

    return (
        <div className=" h-full flex-1 min-h-0 flex flex-col border p-4">
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
                {/* Header */}
                <div className=" p-3 flex justify-between items-center shadow-md h-[60px] bg-accent">
                    <h3 className="text-lg font-medium">Zone Weightings</h3>
                    <button
                        onClick={resetZoneWeights}
                        className="flex items-center gap-2 px-3 py-2 border rounded-md"
                    >
                        <RotateCcw size={16} />
                        <span>Reset to Default</span>
                    </button>
                </div>


                {/* Scrollable Weightings */}
                <Panel>
                    <div className="px-4 py-2 text-sm">
                        Adjust how much each player attribute contributes to team balancing in different zones.
                        Higher values (0-100) give more importance to that attribute in that zone.
                    </div>
                    {weightingLabels.map((zoneObject, zone) => (
                        zoneObject.name !== "Goalkeeper" && <div key={zone} className="mb-6 p-4 rounded-lg border-gray-700 shadow-md">
                            <h4 className=" text-md font-medium">{zoneObject.name}</h4>

                            {zoneObject.positions.map((positionName, position) => (
                                <div key={position} className="mb-6 p-4 rounded-lg border-gray-700 shadow-md">
                                    <h4 className=" text-md font-medium">{positionName}</h4>

                                    <div className="flex flex-col gap-4 mt-3">
                                        {attributeLabels.map((attrLabel, attrIndex) => {
                                            const attr = Number(attrIndex); // Convert index to number for correct reference
                                            return (
                                                <div key={`${zone}-${attr}`} className="flex items-center p-3 rounded-lgborde">
                                                    {/* Attribute Name */}
                                                    <div className="w-32 font-medium">{attrLabel}</div>

                                                    {/* Progress Bar */}
                                                    <div className="flex-1 flex flex-col gap-2">
                                                        <div className="h-2  rounded-md overflow-hidden">
                                                            <div
                                                                className={`h-full ${attributeColors[attr]}`}  // Using the number index for color
                                                                style={{ width: `${zoneWeights[zone][position].weighting[attr]}%` }} // Access zoneWeights by attribute number
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="w-32 flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => adjustWeight(zone, position, attr, -5)}  // Adjust weight based on attribute number
                                                            className={`w-7 h-7 flex items-center justify-center rounded ${zoneWeights[zone][position].weighting[attr] <= 0 && "opacity-50 cursor-not-allowed"
                                                                }`}
                                                            disabled={zoneWeights[zone][position].weighting[attr] <= 0}
                                                        >
                                                            <ChevronDown size={16} />
                                                        </button>

                                                        <div className="w-10 text-center px-2 py-1 rounded-mdfont-bold text-sm">
                                                            {zoneWeights[zone][position].weighting[attr]}  {/* Displaying the current weight */}
                                                        </div>

                                                        <button
                                                            onClick={() => adjustWeight(zone, position, attr, 5)}  // Adjust weight based on attribute number
                                                            className={`w-7 h-7 flex items-center justify-center rounded ${zoneWeights[zone][position].weighting[attr] >= 100 && "opacity-50 cursor-not-allowed"
                                                                }`}
                                                            disabled={zoneWeights[zone][position].weighting[attr] >= 100}
                                                        >
                                                            <ChevronUp size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Info Box */}
                    <div className="m-4 p-4 rounded-lg bg-secondary border border-blue-300 text-secondary-foreground shadow-md">
                        <h4 className="flex items-center font-medium">
                            <Check size={16} className="mr-2" />
                            How Zone Weightings Work
                        </h4>
                        <p className="text-sm mt-1">
                            These weights determine how important each player attribute is when balancing teams across different zones.
                            For example, a high Attack Skill value in the Attack Zone means players with high attack ratings will be
                            evenly distributed between teams for balanced offensive capabilities.
                        </p>
                    </div>
                </Panel>
            </div>

        </div>

    );
};
export default TeamGenerator;
