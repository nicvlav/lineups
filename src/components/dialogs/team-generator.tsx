import { useState, useEffect } from "react";
import { usePlayers } from "@/data/players-provider";
import { Player, ZoneScores, Weighting } from "@/data/types";
import { Users, Dumbbell, Wand2, Check, RotateCcw, Search, ChevronDown, ChevronUp } from "lucide-react";
import Modal from "@/components/dialogs/modal";
import {
    Card,
    CardContent,
    CardDescription,
    // CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface TeamGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
}
// Main component with tabs
const TeamGenerator: React.FC<TeamGeneratorProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState("generation");
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const {
        players,
        generateTeams,
        zoneWeights,
        setZoneWeights,
        resetToDefaultWeights
    } = usePlayers();

    // Get non-temporary players and initialize selected players
    useEffect(() => {
        if (players && Array.isArray(players)) {
            const nonTemps = players.filter((player) => !player.temp_formation);
            setSelectedPlayers(nonTemps.filter((player) => player.team !== null && player.team !== "").map((player) => player.id));
        }
    }, [players]);

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
        await generateTeams(selectedPlayerObjects);
    };

    return (
        <Modal title="Team Generation" isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[80vh] min-w-[300px]">
                {/* Tab Navigation with buttons in a row */}

                <div className="flex gap-2 w-full max-h-[40px]">
                    <button
                        className={`flex-1 flex items-center justify-center p-2 rounded-lg border border-gray-200 transition-all duration-200 ${activeTab === "generation" ? "bg-blue-100 text-blue-600 shadow-sm" : ""}`}
                        onClick={() => setActiveTab("generation")}
                    >
                        <Users size={16} className="mr-2" />
                        <span>Teams</span>
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center p-2 rounded-lg border border-gray-200 transition-all duration-200 ${activeTab === "weighting" ? "bg-blue-100 text-blue-600 shadow-sm" : ""}`}
                        onClick={() => setActiveTab("weighting")}
                    >
                        <Dumbbell size={16} className="mr-2" />
                        <span>Weights</span>
                    </button>
                </div>


                {/* Main Content Area - Flexbox Container */}
                <div className="flex-1 flex flex-col bg-transparent">
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

                {/* Generate Button - Fixed at Bottom */}
                <div className="sticky bottom-0 z-10 bg-transparent pt-3">
                    <button
                        onClick={handleGenerateTeams}
                        disabled={selectedPlayers.length < 2}
                        className={`flex items-center justify-center w-full p-3 rounded-lg font-medium transition-all duration-200 ${selectedPlayers.length < 2 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white cursor-pointer'}`}
                    >
                        <Wand2 size={18} className="mr-2" />
                        <span>Generate Two Teams</span>
                    </button>
                </div>
            </div>
        </Modal>
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

    // Filter non-temporary players
    const getNonTemps = () => {
        if (!players || !Array.isArray(players)) {
            return [];
        }
        return players.filter(player => !player.temp_formation);
    };

    const nonTempPlayers = getNonTemps();

    // Filter players based on search
    const filteredPlayers = nonTempPlayers.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    // Toggle all players selection
    const toggleAll = () => {
        if (selectedPlayers.length === nonTempPlayers.length) {
            setSelectedPlayers([]);
        } else {
            setSelectedPlayers(nonTempPlayers.map(p => p.id));
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
        <div className="flex flex-col h-full">
            {/* Search and Toggle Controls */}
            <div className="sticky top-0 z-10 p-3 border-b bg-accent backdrop-blur-md">
                <div className="flex items-center gap-3 ">
                    {/* Search Input */}
                    <div className="flex  items-center flex-1 borderrounded-xl p-2 transition-all">
                        <Search size={18} className=" mr-3" />
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
                        {selectedPlayers.length === nonTempPlayers.length ? "Deselect All" : "Select All"}
                    </button>
                </div>
            </div>

            {/* Selected count info with icon */}


            {/* Player List - Modern Cards */}
            <Card className="flex-col w-full overflow-y-auto">
                <CardHeader>
                    <CardTitle>Players</CardTitle>
                    <CardDescription>
                        <div className="flex items-center gap-2text-sm">
                            <Users size={16} className="text-white" />
                            <span>
                                Selected {selectedPlayers.length} of {nonTempPlayers.length} players
                                {selectedPlayers.length < 2 && (
                                    <span className="text-red-500 ml-1 flex items-center gap-1">
                                        • Need at least 2 players
                                    </span>
                                )}
                            </span>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="">
                        {sortedPlayers.length > 0 ? (
                            sortedPlayers.map(player => (
                                <div
                                    key={player.id}
                                    className={`flex items-center break-words truncate whitespace-normal rounded-xl transition-transform duration-200 cursor-pointer gap-3 
        ${selectedPlayers.includes(player.id) ? 'bg-white/25' : ''} hover:scale-105`}
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

                                    {/* Stats */}
                                    {/* <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-blue-800 bg-blue-100 text-sm font-semibold">
                                            D:{player.stats[0] || 0}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-red-800 bg-red-100 text-sm font-semibold">
                                            A:{player.stats[1] || 0}
                                        </span>

                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-orange-800 bg-orange-100 text-sm font-semibold">
                                            P:{player.stats[2] || 0}
                                        </span>
                                    </div> */}
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center rounded-xl mt-3">
                                No players match your search
                            </div>
                        )}
                    </div>
                </CardContent>
                {/* <CardFooter>
                    <p>Card Footer</p>
                </CardFooter> */}
            </Card>
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
    const updateZoneWeight = (zone: number, attribute: number, value: number) => {
        // Clamp value between 0 and 100
        const newValue = Math.max(0, Math.min(100, value));

        // Create a new copy of the previous weightings
        const updatedWeights: Weighting = [...zoneWeights] as Weighting;

        // Clone the specific ZoneScores array before modifying
        const updatedZone: ZoneScores = [...updatedWeights[zone]] as ZoneScores;
        updatedZone[attribute] = newValue;

        // Rebuild the tuple while maintaining its structure
        const newWeighting: Weighting = [
            zone === 0 ? updatedZone : updatedWeights[0], // Defense
            zone === 1 ? updatedZone : updatedWeights[1], // Attack
            zone === 2 ? updatedZone : updatedWeights[2], // Athleticism
        ];

        setZoneWeights(newWeighting);
    };

    // Helper to adjust weight by a given amount
    const adjustWeight = (zone: number, attribute: number, adjustment: number) => {
        const currentValue = zoneWeights[zone][attribute];
        updateZoneWeight(zone, attribute, currentValue + adjustment);
    };

    const zoneLabels: Record<number, string> = {
        0: "Defense Zone",
        1: "Midfield Zone",
        2: "Attack Zone"
    };

    const attributeLabels: Record<number, string> = {
        0: "Defense",
        1: "Attack",
        2: "Athletic"
    };

    const attributeColors: Record<number, string> = {
        0: "bg-blue-500",
        1: "bg-red-500",
        2: "bg-amber-500"
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className=" p-3 flex justify-between items-center shadow-md bg-accent">
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
            <div className="flex-1 overflow-y-auto p-4">
                <div className="px-4 py-2 text-sm">
                    Adjust how much each player attribute contributes to team balancing in different zones.
                    Higher values (0-100) give more importance to that attribute in that zone.
                </div>
                {Object.entries(zoneLabels).map(([zone, label]) => (
                    <div key={zone} className="mb-6 p-4 rounded-lg border-gray-700 shadow-md">
                        <h4 className=" text-md font-medium">{label}</h4>

                        <div className="flex flex-col gap-4 mt-3">
                            {Object.entries(attributeLabels).map(([attrIndex, label]) => {
                                const attr = Number(attrIndex); // Convert index to number for correct reference

                                return (
                                    <div key={`${zone}-${attr}`} className="flex items-center p-3 rounded-lgborde">
                                        {/* Attribute Name */}
                                        <div className="w-32 font-medium">{label}</div>

                                        {/* Progress Bar */}
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="h-2  rounded-md overflow-hidden">
                                                <div
                                                    className={`h-full ${attributeColors[attr]}`}  // Using the number index for color
                                                    style={{ width: `${zoneWeights[Number(zone)][attr]}%` }} // Access zoneWeights by attribute number
                                                />
                                            </div>
                                        </div>

                                        {/* Controls */}
                                        <div className="w-32 flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => adjustWeight(Number(zone), attr, -5)}  // Adjust weight based on attribute number
                                                className={`w-7 h-7 flex items-center justify-center rounded ${zoneWeights[Number(zone)][attr] <= 0 && "opacity-50 cursor-not-allowed"
                                                    }`}
                                                disabled={zoneWeights[Number(zone)][attr] <= 0}
                                            >
                                                <ChevronDown size={16} />
                                            </button>

                                            <div className="w-10 text-center px-2 py-1 rounded-mdfont-bold text-sm">
                                                {zoneWeights[Number(zone)][attr]}  {/* Displaying the current weight */}
                                            </div>

                                            <button
                                                onClick={() => adjustWeight(Number(zone), attr, 5)}  // Adjust weight based on attribute number
                                                className={`w-7 h-7 flex items-center justify-center rounded ${zoneWeights[Number(zone)][attr] >= 100 && "opacity-50 cursor-not-allowed"
                                                    }`}
                                                disabled={zoneWeights[Number(zone)][attr] >= 100}
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
            </div>
        </div>
    );
};
export default TeamGenerator;
