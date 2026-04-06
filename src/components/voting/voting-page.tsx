import { motion } from "framer-motion";
import { ArrowUpDown, CheckCircle, Vote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerVoteCard } from "@/components/voting/player-vote-card";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/hooks/use-players";
import { useUserVotes } from "@/hooks/use-voting";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

type TabType = "not-voted" | "voted";
type SortType = "name" | "votes";

export default function VotingPage() {
    const { user, canVote, isVerified } = useAuth();

    // Use direct query hook with background refresh for voting page
    const { data: playersRecord = {} } = usePlayers({
        refetchInterval: 30000, // 30s background refresh while on voting page
        refetchIntervalInBackground: false, // Stop when tab inactive
    });

    const { data: userVotes = new Map() } = useUserVotes();

    const players = Object.values(playersRecord);

    // Log background refresh activity
    useEffect(() => {
        logger.debug("VOTING PAGE: Background refresh enabled (30s interval)");
        return () => {
            logger.debug("VOTING PAGE: Background refresh disabled (left page)");
        };
    }, []);

    const [activeTab, setActiveTab] = useState<TabType>("not-voted");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortType>("name");

    // Filter out user's associated player
    const eligiblePlayers = useMemo(() => {
        return players.filter((player) => {
            const isAssociatedPlayer = user?.profile?.associated_player_id === player.id;
            return !isAssociatedPlayer;
        });
    }, [players, user]);

    // Split into voted/not voted
    const votedPlayers = useMemo(() => {
        return eligiblePlayers.filter((player) => userVotes.has(player.id));
    }, [eligiblePlayers, userVotes]);

    const notVotedPlayers = useMemo(() => {
        return eligiblePlayers.filter((player) => !userVotes.has(player.id));
    }, [eligiblePlayers, userVotes]);

    // Auto-switch to "voted" tab when all players have been voted on
    useEffect(() => {
        if (eligiblePlayers.length > 0 && notVotedPlayers.length === 0) {
            setActiveTab("voted");
        }
    }, [eligiblePlayers.length, notVotedPlayers.length]);

    // Apply search and sort
    const filteredAndSortedPlayers = useMemo(() => {
        const playersToShow = activeTab === "voted" ? votedPlayers : notVotedPlayers;

        // Apply search filter
        let filtered = playersToShow;
        if (searchQuery) {
            const lowerSearch = searchQuery.toLowerCase();
            filtered = playersToShow.filter((p) => p.name.toLowerCase().includes(lowerSearch));
        }

        // Apply sorting
        return [...filtered].sort((a, b) => {
            if (sortBy === "name") {
                return a.name.localeCompare(b.name);
            } else {
                // Sort by vote count (ascending - fewer votes first)
                return (a.vote_count || 0) - (b.vote_count || 0);
            }
        });
    }, [activeTab, votedPlayers, notVotedPlayers, searchQuery, sortBy]);

    const progressPercent = eligiblePlayers.length > 0 ? (votedPlayers.length / eligiblePlayers.length) * 100 : 0;

    const associatedPlayer = user?.profile?.associated_player_id
        ? players.find((p) => p.id === user.profile?.associated_player_id)
        : null;

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
        <div className={cn("flex flex-col h-full w-full px-4 pt-2 pb-4 space-y-2")}>
            {/* Search */}
            <ActionBarSingle>
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                        associatedPlayer ? `Search (excluding ${associatedPlayer.name})...` : "Search players..."
                    }
                    className="w-full"
                />
            </ActionBarSingle>

            {/* Tabbed Panel */}
            <Card className="flex-1 flex flex-col min-h-0 bg-card overflow-hidden py-2 gap-0">
                <div className="flex items-center gap-1.5 px-2 pt-0 pb-0">
                    {(
                        [
                            {
                                key: "not-voted" as TabType,
                                label: "Not Voted",
                                icon: Vote,
                                count: notVotedPlayers.length,
                            },
                            { key: "voted" as TabType, label: "Voted", icon: CheckCircle, count: votedPlayers.length },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg transition-all duration-200",
                                activeTab === tab.key
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                            <span
                                className={cn(
                                    "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
                                    activeTab === tab.key
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted/50 text-muted-foreground"
                                )}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <CardContent className="flex-1 h-full p-0">
                    <div className="h-full overflow-y-auto px-2 custom-scrollbar">
                        {/* Progress + Sort */}
                        <div className="flex items-center gap-3 py-1.5">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-2 bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
                                {votedPlayers.length}/{eligiblePlayers.length}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSortBy(sortBy === "name" ? "votes" : "name")}
                                title={sortBy === "name" ? "Sort by vote count" : "Sort by name"}
                            >
                                <ArrowUpDown />
                            </Button>
                        </div>

                        {/* Player List */}
                        <div className="space-y-2">
                            {filteredAndSortedPlayers.length === 0 ? (
                                <div className="text-center py-12">
                                    {searchQuery ? (
                                        <p className="text-muted-foreground">
                                            No players found matching "{searchQuery}"
                                        </p>
                                    ) : activeTab === "voted" ? (
                                        <div className="space-y-2">
                                            <Vote className="h-12 w-12 mx-auto text-muted-foreground" />
                                            <p className="text-muted-foreground">No votes submitted yet</p>
                                            <p className="text-sm text-muted-foreground">
                                                Switch to "Not Voted" tab to start rating players
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                                            <p className="text-muted-foreground font-medium">
                                                All done! You've rated all {eligiblePlayers.length} players.
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                You can edit any vote by switching to the "Voted" tab
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                filteredAndSortedPlayers.map((player, index) => (
                                    <motion.div
                                        key={player.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: Math.min(index * 0.03, 0.3),
                                        }}
                                    >
                                        <PlayerVoteCard
                                            player={player}
                                            hasVoted={userVotes.has(player.id)}
                                            userVote={userVotes.get(player.id)}
                                        />
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
