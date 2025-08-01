import { useState, useEffect } from "react";
import { usePlayers } from "@/context/players-provider";
import { Player } from "@/data/player-types";
import { Users, Wand2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Panel from "@/components/dialogs/panel"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"

import {
    Card,
    CardContent,
    CardDescription,
    // CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface TeamGeneratorProps {
    isCompact: boolean;
}

// Main component with tabs
const TeamGenerator: React.FC<TeamGeneratorProps> = ({ isCompact }) => {
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const {
        players,
        gamePlayers,
        generateTeams,
    } = usePlayers();
    const navigate = useNavigate();
    isCompact
    // Get non-temporary players and initialize selected players
    useEffect(() => {
        handlePlayersUpdated();
    }, [players, gamePlayers]);

    const handlePlayersUpdated = () => {
        setSelectedPlayers(Object.keys(players).filter((id) => id in gamePlayers));
    };

    // Generate teams with selected players and weights
    const handleGenerateTeams = async () => {
        if (selectedPlayers.length < 2) {
            console.warn("Need at least 2 players to form teams");
            return;
        }

        const selectedPlayerObjects = Object.values(players).filter(
            player => selectedPlayers.includes(player.id)
        );

        // Pass both selectedPlayerObjects and zoneWeights
        generateTeams(selectedPlayerObjects);

        navigate("/");
    };

    const canGenerate = selectedPlayers.length >= 10 && selectedPlayers.length <= 24;

    return (
        <div className="flex-1 min-h-0 w-full h-full p-2">
            <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 w-full">
                    <TeamGenerationTab
                        players={players}
                        selectedPlayers={selectedPlayers}
                        setSelectedPlayers={setSelectedPlayers}
                    />
                </div>

                {/* Generate Button - Fixed at Bottom */}
                <div className="flex-1 max-h-[40px]">
                    <button
                        onClick={handleGenerateTeams}
                        disabled={!canGenerate}
                        className={`flex items-center justify-center h-full w-full rounded-lg font-medium transition-all duration-200 ${canGenerate ? 'bg-green-600 text-white cursor-pointer' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
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
    players: Record<string, Player>;
    selectedPlayers: string[];
    setSelectedPlayers: React.Dispatch<React.SetStateAction<string[]>>;
}

// Team Generation Tab
const TeamGenerationTab: React.FC<TeamGenerationTabProps> = ({ players, selectedPlayers, setSelectedPlayers }) => {
    const [searchTerm, setSearchTerm] = useState<string>("");

    const playersArr = Object.values(players);


    // Filter players based on search
    const filteredPlayers = playersArr.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    // Toggle all players selection
    const toggleAll = () => {
        if (selectedPlayers.length === playersArr.length) {
            setSelectedPlayers([]);
        } else {
            setSelectedPlayers(playersArr.map(p => p.id));
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
        <div className=" h-full flex-1 min-h-0 flex flex-col">
            <div className="flex flex-col flex-1 min-h-0">
                {/* Search and Toggle Controls */}
                <div className="bg-accent h-[40px]">
                    <div className="flex items-center gap-3 ">
                        {/* Search Input */}
                        <div className="flex flex-1 transition-all">
                            <Input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search players..."
                                className="flex-1 rounded w-full"
                            />
                        </div>

                        {/* Select/Deselect All Button */}
                        <Button variant="ghost"
                            className={`flex-1 max-w-[100px] flex items-center justify-center  transition-all duration-200 ${selectedPlayers.length === playersArr.length ? "text-red-600" : ""} `}
                            onClick={toggleAll}>
                            <span>{selectedPlayers.length === playersArr.length ? "Deselect All" : "Select All"}</span>
                        </Button>
                    </div>
                </div>

                {/* Selected count info with icon */}

                <Panel>
                    {/* Player List - Modern Cards */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Squads</CardTitle>
                            <CardDescription>
                                <div className="flex-1 w-full flex items-center gap-2 text-sm">
                                    <Users size={16} className="text-white" />
                                    <span>
                                        Selected {selectedPlayers.length} of {playersArr.length} players
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
                            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                                    <div className="flex rounded-xl">
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
export default TeamGenerator;
