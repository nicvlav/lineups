import { useState, useEffect, useMemo } from "react";
import { usePlayers } from "@/context/players-provider";
import { Player } from "@/data/player-types";
import { Users, Wand2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Panel from "@/components/dialogs/panel"
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ANIMATIONS } from "@/lib/design-tokens";


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
        <div className="flex-1 min-h-0 w-full h-full p-4 space-y-4">
            <div className="flex flex-col h-full space-y-4">
                {/* Section Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Team Generator</h1>
                    <p className="text-muted-foreground">
                        Select players and generate balanced teams using intelligent algorithms
                    </p>
                </div>

                <div className="flex-1 min-h-0 w-full">
                    <TeamGenerationTab
                        players={players}
                        selectedPlayers={selectedPlayers}
                        setSelectedPlayers={setSelectedPlayers}
                    />
                </div>

                {/* Generate Button - Fixed at Bottom */}
                <div className="flex-1 max-h-[40px]">
                    <Button
                        onClick={handleGenerateTeams}
                        disabled={!canGenerate}
                        size="lg"
                        className={cn(
                            "h-full w-full font-medium transition-all duration-200",
                            canGenerate
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                : "opacity-50 cursor-not-allowed",
                            ANIMATIONS.transition.normal
                        )}
                    >
                        <Wand2 size={18} className="mr-2" />
                        <span>Generate Two Teams</span>
                    </Button>
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
    const playersArr = Object.values(players);

    // Sort players alphabetically
    const sortedPlayers = [...playersArr].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    // Custom hook for responsive columns
    const [windowWidth, setWindowWidth] = useState(() => 
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Memoized column distribution for column-wise flow
    const { columns, columnsCount } = useMemo(() => {
        const totalPlayers = sortedPlayers.length;
        if (totalPlayers === 0) return { columns: [], columnsCount: 1 };
        
        // Determine number of columns based on screen size
        const columnsCount = windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1;
        const playersPerColumn = Math.ceil(totalPlayers / columnsCount);
        
        const columns: Player[][] = [];
        for (let i = 0; i < columnsCount; i++) {
            const start = i * playersPerColumn;
            const end = Math.min(start + playersPerColumn, totalPlayers);
            columns.push(sortedPlayers.slice(start, end));
        }
        
        return { columns, columnsCount };
    }, [sortedPlayers, windowWidth]);

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


                {/* Selected count info with icon */}

                {/* Control Header - Fixed height to match Cards tabs */}
                <div className="flex items-center justify-between h-10 mb-4">
                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl">
                        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium">
                            <Users size={16} className="text-muted-foreground" />
                            <span>
                                Selected {selectedPlayers.length} of {playersArr.length} players
                                {!(selectedPlayers.length >= 10 && selectedPlayers.length <= 24) && (
                                    <span className="text-red-500 ml-1">
                                        • Need between 10 and 24 players (inclusive)
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 px-3",
                            selectedPlayers.length === playersArr.length
                                ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                                : "hover:bg-accent hover:text-accent-foreground",
                            ANIMATIONS.transition.normal
                        )}
                        onClick={toggleAll}
                    >
                        <Users size={14} className="mr-1.5" />
                        <span className="text-xs font-medium">
                            {selectedPlayers.length === playersArr.length ? "Deselect" : "Select All"}
                        </span>
                    </Button>
                </div>

                <Panel>
                    {/* Player Selection Grid - Column-wise Distribution */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {columns.length > 0 ? (
                            <div className={cn(
                                "flex gap-4 h-full",
                                columnsCount === 1 ? "flex-col" : 
                                columnsCount === 2 ? "" : ""
                            )}>
                                {columns.map((columnPlayers, columnIndex) => (
                                    <div key={columnIndex} className="flex-1 space-y-2">
                                        {columnPlayers.map(player => (
                                            <div
                                                key={player.id}
                                                className={cn(
                                                    "flex items-center p-3 rounded-xl transition-all duration-200 cursor-pointer gap-3",
                                                    "hover:bg-white/10 border border-transparent",
                                                    selectedPlayers.includes(player.id) 
                                                        ? 'bg-white/25 border-white/30' 
                                                        : 'hover:border-white/20',
                                                    ANIMATIONS.transition.normal
                                                )}
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
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-8 text-muted-foreground">
                                No players available
                            </div>
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
};
export default TeamGenerator;
