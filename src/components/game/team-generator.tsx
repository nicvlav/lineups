import { useState, useEffect, useMemo } from "react";
import { usePlayers } from "@/contexts/players-provider";
import { Users, Wand2, CheckCircle2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ANIMATIONS, GAP, SIZES, SPACING_Y } from "@/lib/design-tokens";
import { PAGE_LAYOUT } from "@/lib/design-tokens/page-tokens";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ActionBarSingle } from "@/components/ui/action-bar";

interface TeamGeneratorProps {
    isCompact: boolean;
}

const TeamGenerator: React.FC<TeamGeneratorProps> = () => {
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const { players, gamePlayers, generateTeams } = usePlayers();
    const navigate = useNavigate();
    
    const playersArr = Object.values(players);
    const sortedPlayers = useMemo(() => 
        [...playersArr].sort((a, b) => a.name.localeCompare(b.name)), 
        [playersArr]
    );

    // Initialize selected players from game
    useEffect(() => {
        setSelectedPlayers(Object.keys(players).filter((id) => id in gamePlayers));
    }, [players, gamePlayers]);

    // Responsive columns
    const [windowWidth, setWindowWidth] = useState(() => 
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Column distribution for responsive layout
    const columns = useMemo(() => {
        if (sortedPlayers.length === 0) return [];
        
        const columnsCount = windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1;
        const playersPerColumn = Math.ceil(sortedPlayers.length / columnsCount);
        
        const cols = [];
        for (let i = 0; i < columnsCount; i++) {
            const start = i * playersPerColumn;
            const end = Math.min(start + playersPerColumn, sortedPlayers.length);
            cols.push(sortedPlayers.slice(start, end));
        }
        
        return cols;
    }, [sortedPlayers, windowWidth]);

    const handleGenerateTeams = async () => {
        if (selectedPlayers.length < 10) {
            toast.error("Need at least 10 players", {
                description: "Select more players to generate teams",
                duration: 3000
            });
            return;
        }

        const selectedPlayerObjects = playersArr.filter(
            player => selectedPlayers.includes(player.id)
        );

        generateTeams(selectedPlayerObjects);
        
        toast.success("Teams generated!", {
            description: `Created balanced teams with ${selectedPlayers.length} players`,
            duration: 2000,
            icon: '⚽'
        });
        
        navigate("/");
    };

    const toggleAll = () => {
        setSelectedPlayers(
            selectedPlayers.length === playersArr.length 
                ? [] 
                : playersArr.map(p => p.id)
        );
    };

    const togglePlayer = (playerId: string) => {
        setSelectedPlayers(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    };

    const canGenerate = selectedPlayers.length >= 10 && selectedPlayers.length <= 24;
    const allSelected = selectedPlayers.length === playersArr.length;

    return (
        <div className={PAGE_LAYOUT.container}>
            {/* Header - Consistent with other pages */}
            <div className={PAGE_LAYOUT.header.wrapper}>
                <h1 className={PAGE_LAYOUT.header.title}>Team Generator</h1>
                <p className={PAGE_LAYOUT.header.description}>
                    Select players to create perfectly balanced teams
                </p>
            </div>

            {/* Status Bar - Consistent height */}
            <div className={PAGE_LAYOUT.actionBar.wrapper}>
                <ActionBarSingle>
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <Badge 
                                variant={canGenerate ? "default" : "secondary"}
                                className={cn("h-7 px-3", GAP.xs)}
                            >
                                <Users className="h-3.5 w-3.5" />
                                {selectedPlayers.length}/{playersArr.length} selected
                            </Badge>
                            
                            {!canGenerate && (
                                <span className="text-xs text-muted-foreground">
                                    Need 10-24 players
                                </span>
                            )}
                        </div>
                        
                        <Button
                            variant={allSelected ? "destructive" : "outline"}
                            size="sm"
                            onClick={toggleAll}
                            className={cn(
                                "h-7 text-xs",
                                ANIMATIONS.transition.normal
                            )}
                        >
                            {allSelected ? (
                                <>Clear All</>
                            ) : (
                                <>
                                    <CheckCircle2 className={cn(SIZES.icon.xs, "mr-1")} />
                                    Select All
                                </>
                            )}
                        </Button>
                    </div>
                </ActionBarSingle>
            </div>

            {/* Player Selection Grid - Clean styling */}
            <div className="flex-1 overflow-hidden">
                <Card className="h-full">
                    <CardContent className="h-full p-4">
                        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                            {columns.length > 0 ? (
                                <div className={cn(
                                    "grid gap-4",
                                    columns.length === 1 ? "grid-cols-1" :
                                    columns.length === 2 ? "grid-cols-2" : "grid-cols-3"
                                )}>
                                    {columns.map((columnPlayers, columnIndex) => (
                                        <div key={columnIndex} className={cn("space-y-2", GAP.xs)}>
                                            {columnPlayers.map(player => (
                                                <div
                                                    key={player.id}
                                                    onClick={() => togglePlayer(player.id)}
                                                    className={cn(
                                                        "group flex items-center p-3 rounded-lg", GAP.sm,
                                                        "border cursor-pointer select-none",
                                                        "transition-all duration-200",
                                                        selectedPlayers.includes(player.id) 
                                                            ? "bg-primary/10 border-primary/30 shadow-sm" 
                                                            : "bg-card hover:bg-accent/50 border-border hover:border-accent",
                                                        "hover:scale-[1.02] active:scale-[0.98]"
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={selectedPlayers.includes(player.id)}
                                                        onCheckedChange={() => togglePlayer(player.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                    <span className={cn(
                                                        "flex-1 text-sm font-medium",
                                                        selectedPlayers.includes(player.id) && "text-primary"
                                                    )}>
                                                        {player.name}
                                                    </span>
                                                    {selectedPlayers.includes(player.id) && (
                                                        <CheckCircle2 className={cn(SIZES.icon.xs, "text-primary opacity-60")} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className={cn("text-center", SPACING_Y.sm)}>
                                        <Users className={cn(SIZES.button.xl, "w-12 mx-auto text-muted-foreground/50")} />
                                        <p className="text-muted-foreground">No players available</p>
                                        <p className="text-xs text-muted-foreground">Add players to get started</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Generate Button - Clean styling */}
            <Button
                    onClick={handleGenerateTeams}
                    disabled={!canGenerate}
                    size="lg"
                className={cn(
                    "w-full font-semibold",
                    !canGenerate && "opacity-50"
                )}
                >
                    <Wand2 className={cn(
                        SIZES.icon.sm, "mr-2",
                        canGenerate && "animate-pulse"
                    )} />
                Generate Balanced Teams
            </Button>
        </div>
    );
};

export default TeamGenerator;