import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddPlayer } from "@/hooks/use-players";

interface AddPlayerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddPlayerDialog({ open, onOpenChange }: AddPlayerDialogProps) {
    const [playerName, setPlayerName] = useState("");
    const addPlayerMutation = useAddPlayer();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = playerName.trim();

        if (trimmedName.length < 2) {
            toast.error("Player name must be at least 2 characters");
            return;
        }

        if (trimmedName.length > 50) {
            toast.error("Player name must be less than 50 characters");
            return;
        }

        addPlayerMutation.mutate(
            { player: { name: trimmedName } },
            {
                onSuccess: () => {
                    toast.success(`Added ${trimmedName}`);
                    setPlayerName("");
                    onOpenChange(false);
                },
                onError: (error) => {
                    toast.error(`Failed to add player: ${error.message}`);
                },
            }
        );
    };

    const handleCancel = () => {
        setPlayerName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Player</DialogTitle>
                        <DialogDescription>Enter the player's name to add them to the squad.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="playerName">Player Name</Label>
                            <Input
                                id="playerName"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="e.g., John Smith"
                                autoFocus
                                disabled={addPlayerMutation.isPending}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={addPlayerMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={addPlayerMutation.isPending}>
                            {addPlayerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Player
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
