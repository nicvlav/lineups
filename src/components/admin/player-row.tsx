import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdatePlayer, useDeletePlayer } from "@/hooks/use-players";
import { Player } from "@/types/players";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PlayerRowProps {
    player: Player;
}

export function PlayerRow({ player }: PlayerRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(player.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const updatePlayerMutation = useUpdatePlayer();
    const deletePlayerMutation = useDeletePlayer();

    const canDelete = player.vote_count === 0;

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleStartEdit = () => {
        setEditedName(player.name);
        setIsEditing(true);
    };

    const handleSave = () => {
        const trimmedName = editedName.trim();

        if (trimmedName === player.name) {
            setIsEditing(false);
            return;
        }

        if (trimmedName.length < 2) {
            toast.error("Player name must be at least 2 characters");
            return;
        }

        if (trimmedName.length > 50) {
            toast.error("Player name must be less than 50 characters");
            return;
        }

        updatePlayerMutation.mutate(
            { id: player.id, name: trimmedName },
            {
                onSuccess: () => {
                    toast.success(`Updated to "${trimmedName}"`);
                    setIsEditing(false);
                },
                onError: (error) => {
                    toast.error(`Failed to update: ${error.message}`);
                },
            }
        );
    };

    const handleCancel = () => {
        setEditedName(player.name);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleViewVote = () => {
        navigate(`/vote?player=${player.id}`);
    };

    const handleDelete = () => {
        if (!canDelete) return;

        if (confirm(`Are you sure you want to delete "${player.name}"?`)) {
            deletePlayerMutation.mutate(
                { id: player.id },
                {
                    onSuccess: () => {
                        toast.success(`Deleted ${player.name}`);
                    },
                    onError: (error) => {
                        toast.error(`Failed to delete: ${error.message}`);
                    },
                }
            );
        }
    };

    return (
        <TableRow className="group">
            <TableCell>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8"
                            disabled={updatePlayerMutation.isPending}
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSave}
                            disabled={updatePlayerMutation.isPending}
                            className="h-8 w-8 p-0"
                        >
                            <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={updatePlayerMutation.isPending}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4 text-red-600" />
                        </Button>
                    </div>
                ) : (
                    <button
                        onClick={handleStartEdit}
                        className="text-left hover:text-primary transition-colors font-medium"
                    >
                        {player.name}
                    </button>
                )}
            </TableCell>

            <TableCell>
                <Badge variant={player.vote_count > 0 ? "default" : "secondary"}>
                    {player.vote_count}
                </Badge>
            </TableCell>

            <TableCell className="text-muted-foreground text-sm">
                {player.created_at ? format(new Date(player.created_at), "MMM d, yyyy") : "—"}
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleViewVote}
                                    className="h-8 w-8 p-0"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View in voting page</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleDelete}
                                    disabled={!canDelete || deletePlayerMutation.isPending}
                                    className="h-8 w-8 p-0 hover:text-destructive disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {canDelete
                                    ? "Delete player"
                                    : `Cannot delete - player has ${player.vote_count} vote${player.vote_count !== 1 ? "s" : ""}`}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </TableCell>
        </TableRow>
    );
}
