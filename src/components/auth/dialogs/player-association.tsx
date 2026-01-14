import { Plus, User, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";

interface PlayerAssociationProps {
    open: boolean;
    onClose: () => void;
}

export function PlayerAssociation({ open, onClose }: PlayerAssociationProps) {
    const { user, updateAssociatedPlayer } = useAuth();
    const { players: playersRecord, addPlayer } = usePlayers();
    const players = Object.values(playersRecord);

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
        user?.profile?.associated_player_id || null
    );
    const [loading, setLoading] = useState(false);
    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState("");

    const currentAssociatedPlayer = user?.profile?.associated_player_id
        ? playersRecord[user.profile.associated_player_id]
        : null;

    const handleCreateAndAssociate = async () => {
        if (!newPlayerName.trim()) {
            toast.error("Please enter a player name");
            return;
        }

        setLoading(true);
        try {
            // Create new player with default stats (most: 6.0, finishing/composure/concentration: 4.0, dribbling/offTheBall: 5.0)
            addPlayer(
                {
                    name: newPlayerName.trim(),
                    stats: {
                        anticipation: 60,
                        defWorkrate: 60,
                        composure: 40,
                        offTheBall: 50,
                        vision: 60,
                        firstTouch: 60,
                        passing: 60,
                        tackling: 60,
                        finishing: 40,
                        speed: 60,
                        strength: 60,
                        agility: 60,
                        attWorkrate: 60,
                        crossing: 60,
                        positioning: 60,
                        technique: 60,
                        dribbling: 50,
                        decisions: 60,
                        marking: 60,
                        heading: 60,
                        aggression: 60,
                        flair: 60,
                        longShots: 60,
                        stamina: 60,
                        teamwork: 60,
                        determination: 60,
                        leadership: 60,
                        concentration: 40,
                    },
                    vote_count: 0,
                },
                async (newPlayer) => {
                    // Associate with the newly created player
                    const { error } = await updateAssociatedPlayer(newPlayer.id);
                    if (error) {
                        toast.error(`Failed to associate with new player: ${error.message}`);
                    } else {
                        toast.success(`Successfully created and associated with ${newPlayer.name}`);
                        setShowCreateNew(false);
                        setNewPlayerName("");
                        onClose();
                    }
                }
            );
        } catch {
            toast.error("Failed to create new player");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPlayerId) {
            toast.error("Please select a player to associate with");
            return;
        }

        setLoading(true);
        try {
            const { error } = await updateAssociatedPlayer(selectedPlayerId);
            if (error) {
                toast.error(`Failed to update association: ${error.message}`);
            } else {
                toast.success(`Successfully associated with ${playersRecord[selectedPlayerId]?.name}`);
                onClose();
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Player Association
                    </DialogTitle>
                    <DialogDescription>
                        Associate your account with a player profile. This will exclude that player from your voting
                        options.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {currentAssociatedPlayer && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Currently associated with:</span>
                            </div>
                            <div className="mt-1">
                                <Badge variant="secondary">{currentAssociatedPlayer.name}</Badge>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Player:</Label>
                        {!showCreateNew ? (
                            <>
                                <Select value={selectedPlayerId || ""} onValueChange={setSelectedPlayerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a player to associate with..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {players
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((player) => (
                                                <SelectItem key={player.id} value={player.id}>
                                                    {player.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCreateNew(true)}
                                    className="w-full mt-2"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Player
                                </Button>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <Input
                                    placeholder="Enter new player name..."
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                            handleCreateAndAssociate();
                                        }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowCreateNew(false);
                                            setNewPlayerName("");
                                        }}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleCreateAndAssociate}
                                        disabled={loading || !newPlayerName.trim()}
                                        className="flex-1"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {loading ? "Creating..." : "Create & Associate"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Note:</strong> Associating with a player will prevent you from voting on that
                            player's stats, ensuring fair and unbiased community ratings.
                        </p>
                    </div>

                    {!showCreateNew && (
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={
                                    loading ||
                                    !selectedPlayerId ||
                                    selectedPlayerId === user?.profile?.associated_player_id
                                }
                            >
                                {loading ? "Saving..." : "Save Association"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
