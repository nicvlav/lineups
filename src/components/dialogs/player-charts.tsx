import { useState } from "react";
import { useTheme } from "@/data/theme-provider";
import { PlayerStats, statLabelMap, StatsKey, statKeys, statShortLabelMap } from "@/data/stat-types";
import { Player, PlayerUpdate } from "@/data/player-types";
import { Minus, Plus } from "lucide-react";
import { } from "lucide-react";
import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js";
import Panel from "@/components/dialogs/panel"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface PlayerChartsProps {
    players: Record<string, Player>;
    selectedPlayer1: string | null;
    setSelectedPlayer1: React.Dispatch<React.SetStateAction<string | null>>;

    selectedPlayer2: string | null;
    setSelectedPlayer2: React.Dispatch<React.SetStateAction<string | null>>;

    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
}

const PlayerCharts: React.FC<PlayerChartsProps> = ({
    players,
    selectedPlayer1,
    setSelectedPlayer1,
    selectedPlayer2,
    setSelectedPlayer2,
    updatePlayerAttributes }) => {

    const sortedPlayers = Object.values(players).sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    const chartPlayer1 = selectedPlayer1 && selectedPlayer1 in players ? players[selectedPlayer1] as Player : null;
    const chartPlayer2 = selectedPlayer2 && selectedPlayer2 in players ? players[selectedPlayer2] as Player : null;

    return (
        <div className=" h-full flex-1 min-h-0 flex flex-col border p-4">
            <div className="flex flex-col flex-1 min-h-0 space-y-4">

                {/* Static Label */}

                {/* Popover Container (Full Width, Equal Split) */}
                <div className="flex-col flex-1 gap-2 sticky top-0 bg-background">
                    <span className="w-[300px] text-right shrink-0">Players:</span>
                    <PlayerPopover
                        players={sortedPlayers}
                        selectedPlayerName={chartPlayer1 ? chartPlayer1.name : null}
                        setSelectedPlayer={setSelectedPlayer1}

                    />
                    <PlayerPopover
                        players={sortedPlayers}
                        selectedPlayerName={chartPlayer2 ? chartPlayer2.name : null}
                        setSelectedPlayer={setSelectedPlayer2}
                    />
                </div>
                <Panel>
                    <PlayerRadarChart
                        player1={chartPlayer1}
                        player2={chartPlayer2}>
                    </PlayerRadarChart>

                    <div className="flex-col flex-1 gap-2 bg-background">
                        {chartPlayer1 && (
                            <div className="mt-2">
                                <span className="w-[300px] text-right shrink-0 truncate">{chartPlayer1.name}:</span>
                                <div className="flex flex-1 flex-col gap-2 ">
                                    <PlayerStatEditor
                                        player={chartPlayer1}
                                        updatePlayerAttributes={updatePlayerAttributes}

                                    />
                                </div>
                            </div>

                        )}

                        {chartPlayer2 && (
                            <div className="mt-2">
                                <span className="w-[300px] text-right shrink-0 truncate">{chartPlayer2.name}:</span>
                                <div className="flex flex-1 flex-col gap-2 ">
                                    <PlayerStatEditor
                                        player={chartPlayer2}
                                        updatePlayerAttributes={updatePlayerAttributes}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Panel>
            </div >

        </div >
    );
};

interface PlayerPopoverProps {
    players: Player[];
    selectedPlayerName: string | null;
    setSelectedPlayer: React.Dispatch<React.SetStateAction<string | null>>;
}

const PlayerPopover: React.FC<PlayerPopoverProps> = ({ players, selectedPlayerName, setSelectedPlayer }) => {
    const [open, setOpen] = useState(false);

    return (

        <div className="flex-1 min-w-0 text-sm"> {/* Flex-grow but does not exceed parent */}
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full flex justify-start truncate"
                    >
                        <span className="truncate">
                            {selectedPlayerName ? selectedPlayerName : "+ Set player"}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-full" side="bottom" align="start">
                    <Command>

                        <CommandInput placeholder="Change player..." />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {/* "None" Option */}
                                <CommandItem
                                    key={0}
                                    value="None"
                                    onSelect={() => {
                                        setSelectedPlayer(null);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    None
                                </CommandItem>

                                {/* Player List */}
                                {players.map((player) => (
                                    <CommandItem
                                        key={player.id}
                                        value={player.name} // Keep name for search functionality
                                        data-value={player.id} // Store ID for selection
                                        onSelect={(value) => {
                                            const selected = players.find((p) => p.name === value)?.id || null;
                                            setSelectedPlayer(selected);
                                            setOpen(false);
                                        }}
                                    >
                                        {player.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>

                </PopoverContent>
            </Popover>
        </div>

    );
};

interface PlayerStatEditorProps {
    player: Player | null;
    updatePlayerAttributes: (id: string, updates: PlayerUpdate) => void;
}

const PlayerStatEditor: React.FC<PlayerStatEditorProps> = ({ player, updatePlayerAttributes }) => {
    if (!player) return <p className="text-center">Select a player to edit stats.</p>;

    const handleAttributeChange = (uid: string, statIndex: StatsKey, change: number) => {
        let newStats2: PlayerStats = player.stats;
        newStats2[statIndex] = Math.max(1, Math.min(100, newStats2[statIndex] + change));
        updatePlayerAttributes(uid, { stats: newStats2 });
    };


    // const halfAttributesLength = Math.ceil(attributeLabels.length / 2);

    return (
        <div className="p-1 border rounded-lg shadow-md text-sm">
            <div className="grid grid-cols-2 gap-2">
                {Object.entries(player.stats).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-1 rounded border">
                        {/* Label */}
                        <span>{statLabelMap[key as StatsKey]}</span>

                        {/* Value + Buttons */}
                        <div className="flex items-center gap-1 bg-accent rounded-md ml-auto">
                            <span>{value}</span>
                            <div className="flex flex-col">
                                <Button
                                    variant="outline"
                                    onClick={() => handleAttributeChange(player.id, key as StatsKey, 5)}
                                    size="sm"
                                    className="w-6 h-4 p-0 flex justify-center items-center rounded-t-md"
                                >
                                    <Plus size={8} />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleAttributeChange(player.id, key as StatsKey, -5)}
                                    size="sm"
                                    className="w-6 h-4 p-0 flex justify-center items-center rounded-b-md"
                                >
                                    <Minus size={8} />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

};

interface PlayerRadarChartProps {
    player1: Player | null;
    player2: Player | null;
}

const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({ player1, player2 }) => {
    if (!player1 && !player2) return <p className="mt-4 text-center">Select at least one player to see stats.</p>;

    const { theme } = useTheme();

    const getForegroundColor = (alpha: number) => {
        return theme === "dark"
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(0, 0, 0, ${alpha})`; // Adjust light mode color if needed
    };

    const labels = statKeys.map(key => statShortLabelMap[key]);
    const datasets = [];

    if (player1) {
        datasets.push({
            label: player1.name,
            data: statKeys.map(key => player1.stats[key]),
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
        });
    }

    if (player2) {
        datasets.push({
            label: player2.name,
            data: statKeys.map(key => player2.stats[key]),
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 2,
        });
    }

    const data = { labels, datasets };

    const options = {
        scales: {
            r: {
                angleLines: {
                    color: "rgba(255, 255, 255, 0.2)", // Adjust grid line color
                },
                grid: {
                    color: getForegroundColor(0.15), // Grid color (light/dark mode friendly)
                },
                pointLabels: {
                    color: getForegroundColor(0.4), // Matches Tailwind's text color
                    font: { size: 14 },
                },
                ticks: {
                    backdropColor: "transparent", // Removes background behind numbers
                    color: getForegroundColor(0.6), // Adjusts tick color
                },
                suggestedMin: 0,
                suggestedMax: 100,
            },
        },
        plugins: {
            legend: {
                labels: {
                    color: getForegroundColor(1.0), // Ensures the legend matches theme colors
                },
            },
        },
    };

    return <Radar data={data} options={options} className="bg-background p-4 rounded-lg" />;
};

export default PlayerCharts;
