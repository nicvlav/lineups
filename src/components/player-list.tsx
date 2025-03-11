import { useState, useRef, useEffect } from "react";
import { Player, DnDPlayerItem } from "@/data/types";
import { usePlayers } from "@/data/players-provider";
import { useDrag } from "react-dnd";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";

const PlayerList = () => {
    const { players, addPlayer, deletePlayer } = usePlayers();
    const [newPlayerName, setNewPlayerName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortOrder, setSortOrder] = useState("desc");

    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleAddPlayer = async () => {
        if (newPlayerName.trim()) {
            await addPlayer(newPlayerName);
            setNewPlayerName("");
            setIsAdding(false);
        }
    };

    const handleShowAddField = () => setIsAdding(true);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") handleAddPlayer();
    };

    const handleDeletePlayer = async (id: string) => await deletePlayer(id);

    const handleSortChange = (mode: string) => {
        setSortOrder(mode);
    };
    const getNonGuests = () => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.guest !== true);
    };

    const filteredPlayers = getNonGuests();

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortOrder === "desc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
    });



    useEffect(() => {
        if (isAdding && inputRef.current) inputRef.current.focus();
    }, [isAdding]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%'
        }}>
            {/* Sort Controls */}
            <SortControls handleSortChange={handleSortChange} />

            {/* Player List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '12px'
            }}>
                {sortedPlayers.map((player) => (
                    <PlayerRow
                        key={player.id}
                        player={player}
                        onDelete={() => handleDeletePlayer(player.id)}
                    />
                ))}

                {sortedPlayers.length === 0 && (
                    <div style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: '#999'
                    }}>
                        No players added yet
                    </div>
                )}
            </div>

            {/* Add Player Section */}
            <AddPlayerSection
                isAdding={isAdding}
                newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName}
                handleKeyDown={handleKeyDown}
                handleAddPlayer={handleAddPlayer}
                handleShowAddField={handleShowAddField}
                inputRef={inputRef as React.RefObject<HTMLInputElement>}
            />
        </div>
    );
};

interface SortControlsProps {
    handleSortChange: (mode: string) => void;
}

const SortControls: React.FC<SortControlsProps> = ({ handleSortChange }) => (
    <div style={{
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center'
    }}>
        <label style={{ marginRight: '8px' }}>Sort:</label>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
        }}>

            <Select onValueChange={handleSortChange}>
                {/* Trigger button for the select */}
                <SelectTrigger>
                    <SelectValue placeholder="Sort"></SelectValue>
                </SelectTrigger>

                {/* Dropdown content with dynamically grouped formations */}
                <SelectContent>
                    <SelectItem key={"desc"} value={"desc"}>
                        {"A-Z"}
                    </SelectItem>
                    <SelectItem key={"asc"} value={"asc"}>
                        {"Z-A"}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
);

interface PlayerRowProps {
    player: Player;
    onDelete: () => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ player, onDelete }) => {
    // Set up drag functionality
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "PLAYER",
        item: { id: player.id, name: player.name, team: player.team } as DnDPlayerItem,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const divRef = useRef<HTMLDivElement>(null);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '4px',
                borderBottom: '1px solid #eee',
                opacity: isDragging ? 0.5 : 1,
                cursor: 'grab'
            }}
        >
            {/* Player name - draggable */}
            <div
                ref={(node) => {
                    drag(node);
                    divRef.current = node; // Store the reference if needed elsewhere
                }}
                style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                }}
            >
                {player.name}
            </div>

            {/* Delete button */}
            <Button
                onClick={onDelete}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f44336',
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Trash2 size={16} />
            </Button>
        </div>
    );
};

interface AddPlayerSectionProps {
    isAdding: boolean;
    newPlayerName: string;
    setNewPlayerName: (newName: string) => void;
    handleKeyDown: (event: React.KeyboardEvent) => void;
    handleAddPlayer: () => void;
    handleShowAddField: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
}

const AddPlayerSection: React.FC<AddPlayerSectionProps> = ({
    isAdding,
    newPlayerName,
    setNewPlayerName,
    handleKeyDown,
    handleAddPlayer,
    handleShowAddField,
    inputRef
}) => {
    // Set the height dynamically based on `isAdding`
    const containerHeight = isAdding ? '120px' : '60px'; // Adjust values as needed

    return (
        <div style={{
            borderTop: '1px solid #eee',
            padding: '12px 0',
            width: '100%', // Ensure full width
            height: containerHeight, // Set dynamic height
            display: 'flex',
            flexDirection: 'column', // Stack elements vertically
        }}>
            {isAdding ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            marginBottom: '8px', // Add space between input and button
                        }}
                        placeholder="Enter player name"
                    />
                    <Button
                        onClick={handleAddPlayer}
                        style={{
                            padding: '8px 12px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Add
                    </Button>
                </div>
            ) : (
                <Button
                    onClick={handleShowAddField}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%', // Ensure full width for the button
                        padding: '8px 0',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    <UserPlus size={16} style={{ marginRight: '8px' }} />
                    Add Player
                </Button>
            )}
        </div>
    );
};


export default PlayerList;
