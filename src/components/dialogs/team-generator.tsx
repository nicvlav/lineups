import React, { useState, useEffect } from "react";
import { usePlayers } from "@/data/players-provider";
import { Player } from "@/data/types";
import { Users, Wand2, Search } from "lucide-react";
import Modal from "@/components/dialogs/modal";

// Interface for component props
interface TeamGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
}

const TeamGenerator: React.FC<TeamGeneratorProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<"generation" | "weighting">("generation");
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    // const { players, generateTeams, zoneWeights, setZoneWeights, resetToDefaultWeights } = usePlayers();
    const { players, generateTeams } = usePlayers();

    useEffect(() => {
        if (players && Array.isArray(players)) {
            const nonTemps = players.filter((player) => !player.temp_formation);
            setSelectedPlayers(nonTemps.filter((player) => player.team !== null && player.team !== "").map((player) => player.id));
        }
    }, [players]);

    const handleGenerateTeams = async () => {
        if (selectedPlayers.length < 2) {
            console.warn("Need at least 2 players to form teams");
            return;
        }

        const selectedPlayerObjects = players.filter((player) => selectedPlayers.includes(player.id));
        await generateTeams(selectedPlayerObjects);
    };

    return (
        <Modal title="Player Attributes" isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[80vh] max-h-[80vh] overflow-hidden bg-transparent">
                {/* Tab Navigation */}
                <div className="sticky top-0 z-10 bg-transparent p-2 mb-2">
                    <div className="flex flex-row w-full gap-2">
                        <button
                            className={`flex items-center justify-center p-2 border border-gray-300 rounded-lg flex-1 transition-all
                            ${activeTab === "generation" ? "bg-blue-100 text-blue-600 shadow" : ""}
                        `}
                            onClick={() => setActiveTab("generation")}
                        >
                            <Users size={16} className="mr-2" />
                            <span>Teams</span>
                        </button>
                        {/* <button
                            className={`flex items-center justify-center p-2 border border-gray-300 rounded-lg flex-1 transition-all
                            ${activeTab === "weighting" ? "bg-blue-100 text-blue-600 shadow" : ""}
                        `}
                            onClick={() => setActiveTab("weighting")}
                        >
                            <Dumbbell size={16} className="mr-2" />
                            <span>Weights</span>
                        </button> */}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-transparent rounded-lg border border-gray-200">
                    {/* {activeTab === "generation" ? ( */}
                    <TeamGenerationTab players={players} selectedPlayers={selectedPlayers} setSelectedPlayers={setSelectedPlayers} />
                    {/* ) : ( */}
                    {/* <WeightingTab zoneWeights={zoneWeights} setZoneWeights={setZoneWeights} resetZoneWeights={resetToDefaultWeights} /> */}
                    {/* )} */}
                </div>

                {/* Generate Button */}
                <div className="sticky bottom-0 z-10 bg-transparent pt-3">
                    <button
                        onClick={handleGenerateTeams}
                        disabled={selectedPlayers.length < 2}
                        className={`flex items-center justify-center p-3 w-full rounded-lg font-medium transition-all
                        ${selectedPlayers.length < 2 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white"}
                    `}
                    >
                        <Wand2 size={18} className="mr-2" />
                        <span>Generate Two Teams</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Team Generation Tab
interface TeamGenerationTabProps {
    players: Player[];
    selectedPlayers: string[];
    setSelectedPlayers: React.Dispatch<React.SetStateAction<string[]>>;
}

const TeamGenerationTab: React.FC<TeamGenerationTabProps> = ({ players, selectedPlayers, setSelectedPlayers }) => {
    const [searchTerm, setSearchTerm] = useState<string>("");

    const nonTempPlayers = players.filter((player) => !player.temp_formation);
    const filteredPlayers = nonTempPlayers.filter((player) => player.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const togglePlayer = (playerId: string) => {
        setSelectedPlayers((prev) => prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]);
    };

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="flex flex-col w-full h-full overflow-hidden gap-3">
            {/* Search Bar */}
            <div className="sticky top-0 z-10 p-3 bg-transparent border-b backdrop-blur-sm">
                <div className="flex items-center gap-3 w-full">
                    <div className="flex w-full items-center flex-1ounded-lg px-3 border border-gray-300">
                        <Search size={18} className="mr-2" />
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent outline-none text-sm w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Players List */}
            <div className="flex-1 overflow-auto p-3">
                {sortedPlayers.map((player) => (
                    <div
                        key={player.id}
                        className={`flex items-center p-3 mb-2 border border-gray-300 rounded-lg cursor-pointer transition-all
                            ${selectedPlayers.includes(player.id) ? "bg-card hover:bg-card" : "bg-secondary hover:bg-card"}
                        `}
                        onClick={() => togglePlayer(player.id)}
                    >
                        <input
                            type="checkbox"
                            checked={selectedPlayers.includes(player.id)}
                            className="w-4 h-4 mr-3 cursor-pointer"
                            readOnly
                        />
                        <span className="flex-1">{player.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Weighting Tab
// interface WeightingTabProps {
//     zoneWeights: Weighting;
//     setZoneWeights: (weights: Weighting) => void;
//     resetZoneWeights: () => void;
// }

// const WeightingTab: React.FC<WeightingTabProps> = ({ zoneWeights, setZoneWeights, resetZoneWeights }) => {
//     return (
//         <div className="flex flex-col h-full overflow-hidden p-3">
//             <h3 className="text-lg font-medium">Zone Weightings</h3>
//             <button onClick={resetZoneWeights} className="p-2 mt-3 rounded-lg text-sm">
//                 <RotateCcw size={16} className="mr-2" /> Reset to Default
//             </button>
//         </div>
//     );
// };

export default TeamGenerator;
