import { useState, useEffect, useMemo } from "react";
import { usePlayers } from "@/context/players-provider";
import { Users, Wand2, CheckCircle2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ANIMATIONS, GAP } from "@/lib/design-tokens";
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

    const canGenerate = selectedPlayers.length >= 10 && selectedPlayers.length <= 26;
    const allSelected = selectedPlayers.length === playersArr.length;

    return (
        <div className={cn("flex-1 h-full w-full p-4 space-y-4")}>
            <div className="flex flex-col h-full space-y-4">
                {/* Modern Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Team Generator
                    </h1>
                    <p className="text-muted-foreground">
                        Select players and let our AI create perfectly balanced teams
                    </p>
                </div>

                {/* Status Bar with Modern Design */}
                <ActionBarSingle>
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <Badge 
                                variant={canGenerate ? "default" : "secondary"}
                                className="h-7 px-3 gap-1.5"
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
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Select All
                                </>
                            )}
                        </Button>
                    </div>
                </ActionBarSingle>

                {/* Modern Player Selection Grid */}
                <Card className="flex-1 overflow-hidden bg-gradient-to-br from-card to-muted/20">
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
                                                        "group flex items-center gap-3 p-3 rounded-lg",
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
                                                        <CheckCircle2 className="h-4 w-4 text-primary opacity-60" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center space-y-2">
                                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                        <p className="text-muted-foreground">No players available</p>
                                        <p className="text-xs text-muted-foreground">Add players to get started</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Modern Generate Button */}
                <Button
                    onClick={handleGenerateTeams}
                    disabled={!canGenerate}
                    size="lg"
                    className={cn(
                        "w-full h-12 font-semibold text-base",
                        "transition-all duration-300",
                        canGenerate && "shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
                        canGenerate 
                            ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                            : "opacity-50"
                    )}
                >
                    <Wand2 className={cn(
                        "mr-2 h-5 w-5",
                        canGenerate && "animate-pulse"
                    )} />
                    Generate Balanced Teams
                </Button>
            </div>
        </div>
    );
};

export default TeamGenerator;