import { useState, useMemo } from "react";
import { usePlayers } from "@/hooks/use-players";
import { PlayerRow } from "./player-row";
import { AddPlayerDialog } from "./add-player-dialog";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, ArrowUpDown } from "lucide-react";

type SortField = "name" | "votes" | "created";
type SortDirection = "asc" | "desc";

export default function PlayerManager() {
    const { data: playersRecord = {}, isLoading } = usePlayers();
    const players = Object.values(playersRecord);

    const [searchQuery, setSearchQuery] = useState("");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    // Filter and sort players
    const filteredAndSortedPlayers = useMemo(() => {
        let filtered = players;

        // Apply search filter
        if (searchQuery.trim()) {
            const lowerSearch = searchQuery.toLowerCase();
            filtered = players.filter((p) =>
                p.name.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply sorting
        return [...filtered].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "votes":
                    comparison = (a.vote_count || 0) - (b.vote_count || 0);
                    break;
                case "created":
                    // Parse dates and compare timestamps (newest first when desc)
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [players, searchQuery, sortField, sortDirection]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <TableHead>
            <button
                onClick={() => toggleSort(field)}
                className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
            >
                {children}
                <ArrowUpDown className="h-4 w-4 opacity-50" />
            </button>
        </TableHead>
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground">Loading players...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Manage Players</CardTitle>
                            <CardDescription>
                                Add, edit, and manage player names
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowAddDialog(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Player
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Search */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search players..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader field="name">Name</SortableHeader>
                                    <SortableHeader field="votes">Votes</SortableHeader>
                                    <SortableHeader field="created">Created</SortableHeader>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedPlayers.length === 0 ? (
                                    <TableRow>
                                        <td colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {searchQuery
                                                ? `No players found matching "${searchQuery}"`
                                                : "No players yet. Add one to get started!"}
                                        </td>
                                    </TableRow>
                                ) : (
                                    filteredAndSortedPlayers.map((player) => (
                                        <PlayerRow key={player.id} player={player} />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer stats */}
                    <div className="mt-4 text-sm text-muted-foreground">
                        Showing {filteredAndSortedPlayers.length} of {players.length} players
                    </div>
                </CardContent>
            </Card>

            {/* Add Player Dialog */}
            <AddPlayerDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        </div>
    );
}
