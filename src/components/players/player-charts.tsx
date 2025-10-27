import { useState } from "react";
import { useTheme } from "@/context/theme-provider";
import { StatCategory, StatCategoryNameMap, StatCategoryKeys } from "@/data/stat-types";
import { Player, getZoneAverages, ZoneAverages } from "@/data/player-types";
import { } from "lucide-react";
import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js";
import Panel from "@/components/shared/panel"

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
}

const PlayerCharts: React.FC<PlayerChartsProps> = ({
    players,
    selectedPlayer1,
    setSelectedPlayer1,
    selectedPlayer2,
    setSelectedPlayer2 }) => {

    const sortedPlayers = Object.values(players).sort((a, b) => {
        return a.name.localeCompare(b.name);
    });


    const chartPlayer1 = selectedPlayer1 && selectedPlayer1 in players ? players[selectedPlayer1] as Player : null;
    const chartPlayer2 = selectedPlayer2 && selectedPlayer2 in players ? players[selectedPlayer2] as Player : null;

    const chartPlayer1Stats = chartPlayer1 ? getZoneAverages(chartPlayer1) : null;
    const chartPlayer2Stats = chartPlayer2 ? getZoneAverages(chartPlayer2) : null;

    return (
        <div className=" h-full flex-1 min-h-0 flex flex-col">
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
                        player1Stats={chartPlayer1Stats}
                        player2={chartPlayer2}
                        player2Stats={chartPlayer2Stats}>
                    </PlayerRadarChart>

                    <div className="flex-col flex-1 gap-2 bg-background">
                        {chartPlayer1 && (
                            <div className="mt-2">
                                <span className="w-[300px] text-right shrink-0 truncate">{chartPlayer1.name}:</span>
                                <div className="flex flex-1 flex-col gap-2">
                                    <PlayerStatViewer
                                        player={chartPlayer1}
                                        playerStats={chartPlayer1Stats}
                                    />
                                </div>
                            </div>

                        )}

                        {chartPlayer2 && (
                            <div className="mt-2">
                                <span className="w-[300px] text-right shrink-0 truncate">{chartPlayer2.name}:</span>
                                <div className="flex flex-1 flex-col gap-2 mt-2">
                                    <PlayerStatViewer
                                        player={chartPlayer2}
                                        playerStats={chartPlayer2Stats}
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

interface PlayerStatViewerProps {
    player: Player | null;
    playerStats: ZoneAverages | null;
}

const PlayerStatViewer: React.FC<PlayerStatViewerProps> = ({ player, playerStats }) => {
    if (!player || !playerStats) return <p className="text-center">Select a player to view stats.</p>;

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {StatCategoryKeys.map((label) => (
                <div key={label} className="flex justify-between items-center border bg-accent rounded-md px-3 py-2">
                    <span>{StatCategoryNameMap[label as StatCategory]}:</span>
                    <span>{playerStats[label as StatCategory]}</span>
                </div>
            ))}
        </div>
    );
};

interface PlayerRadarChartProps {
    player1: Player | null;
    player2: Player | null;
    player1Stats: ZoneAverages | null;
    player2Stats: ZoneAverages | null;
}

const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({ player1, player2, player1Stats, player2Stats }) => {
    if (!player1 && !player2) return <p className="mt-4 text-center">Select at least one player to see stats.</p>;

    const { theme } = useTheme();

    const getForegroundColor = (alpha: number) => {
        return theme === "dark"
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(0, 0, 0, ${alpha})`; // Adjust light mode color if needed
    };

    const labels = StatCategoryKeys.map(key => StatCategoryNameMap[key]);
    const datasets = [];

    if (player1 && player1Stats) {
        datasets.push({
            label: player1.name,
            data: StatCategoryKeys.map(key => player1Stats[key]),
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
        });
    }

    if (player2 && player2Stats) {
        datasets.push({
            label: player2.name,
            data: StatCategoryKeys.map(key => player2Stats[key]),
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
