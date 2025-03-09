import React, { useState, useContext, useRef, useEffect } from "react";
import { PlayersContext } from "../../utility/PlayersContext.jsx";
import { useDrag } from "react-dnd";
import { Trash2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

const PlayerList = () => {
    const { players, addPlayer, deletePlayer } = useContext(PlayersContext);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortOrder, setSortOrder] = useState("desc");

    const inputRef = useRef(null);

    const handleAddPlayer = async () => {
        if (newPlayerName.trim()) {
            await addPlayer(newPlayerName);
            setNewPlayerName("");
            setIsAdding(false);
        }
    };

    const handleShowAddField = () => setIsAdding(true);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleAddPlayer();
    };

    const handleDeletePlayer = async (uid) => await deletePlayer(uid);

    const handleSortChange = (e) => setSortOrder(e.target.value);

    const getNonGuests = () => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.guest !== true);
    };

    const filteredPlayers = getNonGuests(players);

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
            <SortControls sortOrder={sortOrder} handleSortChange={handleSortChange} />

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
                inputRef={inputRef}
            />
        </div>
    );
};

const SortControls = ({ sortOrder, handleSortChange }) => (
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
            <select
                value={sortOrder}
                onChange={handleSortChange}
                style={{ 
                    padding: '4px 8px', 
                    border: 'none',
                    outline: 'none',
                    background: 'transparent'
                }}
            >
                <option value="desc">A-Z</option>
                <option value="asc">Z-A</option>
            </select>
            {sortOrder === "desc" ? 
                <ChevronDown size={16} style={{ marginRight: '4px' }} /> : 
                <ChevronUp size={16} style={{ marginRight: '4px' }} />
            }
        </div>
    </div>
);

const PlayerRow = ({ player, onDelete }) => {
    // Set up drag functionality
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "PLAYER",
        item: { uid: player.id, name: player.name },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

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
                ref={drag}
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
            <button
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
            </button>
        </div>
    );
};

const AddPlayerSection = ({
    isAdding,
    newPlayerName,
    setNewPlayerName,
    handleKeyDown,
    handleAddPlayer,
    handleShowAddField,
    inputRef
}) => (
    <div style={{ 
        borderTop: '1px solid #eee',
        padding: '12px 0' 
    }}>
        {isAdding ? (
            <div style={{ display: 'flex' }}>
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
                        marginRight: '8px'
                    }}
                    placeholder="Enter player name"
                />
                <button
                    onClick={handleAddPlayer}
                    style={{ 
                        padding: '8px 12px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Add
                </button>
            </div>
        ) : (
            <button
                onClick={handleShowAddField}
                style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '8px 0',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                <UserPlus size={16} style={{ marginRight: '8px' }} />
                Add Player
            </button>
        )}
    </div>
);

export default PlayerList;
