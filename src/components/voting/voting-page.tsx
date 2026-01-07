import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers as usePlayersQuery } from "@/hooks/use-players";
import { useVoting } from "@/context/voting-provider";
import { PlayerVoteCard } from "@/components/voting/player-vote-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Vote, CheckCircle, ArrowUpDown } from "lucide-react";
import { ActionBarSingle } from "@/components/ui/action-bar";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

type TabType = 'not-voted' | 'voted';
type SortType = 'name' | 'votes';

export default function VotingPage() {
  const { user, canVote, isVerified } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Use direct query hook with background refresh for voting page
  const { data: playersRecord = {} } = usePlayersQuery({
    refetchInterval: 30000, // 30s background refresh while on voting page
    refetchIntervalInBackground: false, // Stop when tab inactive
  });

  const { userVotes } = useVoting();

  const players = Object.values(playersRecord);

  // Log background refresh activity
  useEffect(() => {
    console.log("🗳️ VOTING PAGE: Background refresh enabled (30s interval)");
    return () => {
      console.log("🗳️ VOTING PAGE: Background refresh disabled (left page)");
    };
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('not-voted');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('name');

  // Pre-populate search from query params (e.g., from admin page link)
  useEffect(() => {
    const playerId = searchParams.get('player');
    if (playerId && playersRecord[playerId]) {
      const player = playersRecord[playerId];
      setSearchQuery(player.name);
      // Clear the query param after using it
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, playersRecord, setSearchParams]);

  // Filter out user's associated player
  const eligiblePlayers = useMemo(() => {
    return players.filter(player => {
      const isAssociatedPlayer = user?.profile?.associated_player_id === player.id;
      return !isAssociatedPlayer;
    });
  }, [players, user]);

  // Split into voted/not voted
  const votedPlayers = useMemo(() => {
    return eligiblePlayers.filter(player => userVotes.has(player.id));
  }, [eligiblePlayers, userVotes]);

  const notVotedPlayers = useMemo(() => {
    return eligiblePlayers.filter(player => !userVotes.has(player.id));
  }, [eligiblePlayers, userVotes]);

  // Apply search and sort
  const filteredAndSortedPlayers = useMemo(() => {
    const playersToShow = activeTab === 'voted' ? votedPlayers : notVotedPlayers;

    // Apply search filter
    let filtered = playersToShow;
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      filtered = playersToShow.filter(p =>
        p.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by vote count (ascending - fewer votes first)
        return (a.vote_count || 0) - (b.vote_count || 0);
      }
    });
  }, [activeTab, votedPlayers, notVotedPlayers, searchQuery, sortBy]);

  const progressPercent = eligiblePlayers.length > 0
    ? (votedPlayers.length / eligiblePlayers.length) * 100
    : 0;

  const associatedPlayer = user?.profile?.associated_player_id
    ? players.find(p => p.id === user.profile?.associated_player_id)
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
            <Button onClick={() => window.location.href = '/'}>
              Go to Sign In
            </Button>
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
            <Button className="mt-4" onClick={() => window.location.href = '/'}>
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
        <h1 className="text-2xl font-bold tracking-tight">Player Evaluation</h1>
        <p className="text-muted-foreground">
          Vote for any player, any time. Your votes help build fair teams.
        </p>
      </div>

      {/* Stats Bar */}
      <ActionBarSingle className='h-15'>
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

          {associatedPlayer && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Excluding {associatedPlayer.name} (your profile)
            </p>
          )}
        </div>
      </ActionBarSingle>

      {/* Tabbed Panel */}
      <Card className="flex-1 flex flex-col min-h-0 bg-linear-to-r from-card to-muted/20 overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle>
            {/* Tab Buttons */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'not-voted' ? 'default' : 'outline'}
                onClick={() => setActiveTab('not-voted')}
                className="flex items-center gap-2"
              >
                <Vote className="h-4 w-4" />
                Not Voted
                <Badge variant={activeTab === 'not-voted' ? 'secondary' : 'outline'}>
                  {notVotedPlayers.length}
                </Badge>
              </Button>
              <Button
                variant={activeTab === 'voted' ? 'default' : 'outline'}
                onClick={() => setActiveTab('voted')}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Voted
                <Badge variant={activeTab === 'voted' ? 'secondary' : 'outline'}>
                  {votedPlayers.length}
                </Badge>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 h-full p-0">
          <div className="h-full overflow-y-auto pl-4 pr-4 custom-scrollbar">
            <div className="flex gap-3 text-center">
              <CheckCircle className="w-4 text-muted-foreground" />
              <span className="font-medium">
                {votedPlayers.length}/{eligiblePlayers.length} rated
              </span>
              <span className="text-muted-foreground">
                ({progressPercent.toFixed(0)}%)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === 'name' ? 'votes' : 'name')}
                title={sortBy === 'name' ? 'Sort by vote count' : 'Sort by name'}
              >
                <ArrowUpDown className="" />
              </Button>
            </div>

            {/* Search and Sort */}
            <div className="flex gap-2">

            </div>

            {/* Sort indicator */}
            <div className="text-xs text-muted-foreground">
              Sorted by: {sortBy === 'name' ? 'Name (A-Z)' : 'Vote Count (Fewest First)'}
            </div>

            {/* Player List */}
            <div className="space-y-2">
              {filteredAndSortedPlayers.length === 0 ? (
                <div className="text-center py-12">
                  {searchQuery ? (
                    <p className="text-muted-foreground">
                      No players found matching "{searchQuery}"
                    </p>
                  ) : activeTab === 'voted' ? (
                    <div className="space-y-2">
                      <Vote className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No votes submitted yet
                      </p>
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
                filteredAndSortedPlayers.map(player => (
                  <PlayerVoteCard
                    key={player.id}
                    player={player}
                    hasVoted={userVotes.has(player.id)}
                    userVote={userVotes.get(player.id)}
                  />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
