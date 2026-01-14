import { ArrowUpDown, Plus, Vote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth-context";
import { usePlayers as usePlayersQuery } from "@/hooks/use-players";
import { cn } from "@/lib/utils";
import { AddPlayerDialog } from "./add-player-dialog";
import { PlayerRow } from "./player-row";

type SortField = "name" | "votes" | "created";
type SortDirection = "asc" | "desc";

export default function PlayerManager() {
    const { user, canVote, isVerified } = useAuth();

    // Use direct query hook with background refresh for voting page
    const { data: playersRecord = {}, isLoading } = usePlayersQuery({
        refetchInterval: 30000, // 30s background refresh while on voting page
        refetchIntervalInBackground: false, // Stop when tab inactive
    });

    const players = Object.values(playersRecord);

    // Log background refresh activity
    useEffect(() => {
        console.log("🗳️ VOTING PAGE: Background refresh enabled (30s interval)");
        return () => {
            console.log("🗳️ VOTING PAGE: Background refresh disabled (left page)");
        };
    }, []);

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
            filtered = players.filter((p) => p.name.toLowerCase().includes(lowerSearch));
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
                case "created": {
                    // Parse dates and compare timestamps (newest first when desc)
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                }
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

    if (!user) {
        return (
            <div className="flex justify-center items-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Vote className="h-12 w-12 mx-auto text-muted-foreground" />
                        <CardTitle>Sign In Required</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground mb-4">
                            You need to be signed in to participate in player voting.
                        </p>
                        <Button onClick={() => (window.location.href = "/")}>Go to Sign In</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

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

    if (!canVote || !isVerified) {
        return (
            <div className="flex justify-center items-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Vote className="h-12 w-12 mx-auto text-muted-foreground" />
                        <CardTitle>Squad Verification Required</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground mb-4">
                            You need to complete squad verification and player association to access voting features.
                        </p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>• Join an authorized squad</p>
                            <p>• Associate with a player profile</p>
                            <p>• Complete verification process</p>
                        </div>
                        <Button className="mt-4" onClick={() => (window.location.href = "/")}>
                            Complete Verification
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full w-full p-4 space-y-4")}>
            {/* Header Section */}
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Manage Players</h1>
                <p className="text-muted-foreground">Add, edit, and manage players</p>
            </div>

            {/* Stats Bar */}
            <ActionBarSingle className="h-15">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search players..."
                            className="w-full"
                        />
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Player
                    </Button>
                </div>
            </ActionBarSingle>

            {/* Tabbed Panel */}
            <Card className="flex-1 flex flex-col min-h-0 bg-linear-to-r from-card to-muted/20 overflow-hidden">
                <CardContent className="flex-1 h-full p-0">
                    <div className="h-full overflow-y-auto pl-4 pr-4 custom-scrollbar">
                        {/* Player List */}
                        <div className="space-y-2">
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
                    </div>
                </CardContent>
            </Card>

            {/* Add Player Dialog */}
            <AddPlayerDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        </div>
    );
}
