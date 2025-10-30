import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { usePlayers } from "@/context/players-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface VoteData {
    playerId: string;
    votes: Record<string, number>;
}

interface VotingStats {
    totalPlayers: number;
    playersVoted: number;
    totalVoters: number;
}

interface VotingContextType {
    // Voting stats (cached and updated via real-time)
    votingStats: VotingStats;
    playersWithVotes: Set<string>;

    // User's personal votes (cached to avoid repeated queries)
    userVotes: Map<string, any>;
    loadUserVotes: () => Promise<void>;

    // Vote submission
    submitVote: (voteData: VoteData) => Promise<void>;
    getPendingVoteCount: () => number;
    recoverFailedVotes: () => void;
}

export const VotingContext = createContext<VotingContextType | undefined>(undefined);

interface VotingProviderProps {
    children: ReactNode;
}

export const VotingProvider: React.FC<VotingProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const { players } = usePlayers();

    // Voting stats - cached and updated via real-time
    const [votingStats, setVotingStats] = useState<VotingStats>({ totalPlayers: 0, playersVoted: 0, totalVoters: 0 });
    const [playersWithVotes, setPlayersWithVotes] = useState<Set<string>>(new Set());

    // Cache user's personal votes to avoid repeated queries
    const [userVotes, setUserVotes] = useState<Map<string, any>>(new Map());
    const [userVotesLoaded, setUserVotesLoaded] = useState(false);

    // Modern vote queue system with retry logic
    const pendingVotesRef = useRef<Map<string, {
        data: VoteData;
        retryCount: number;
        lastAttempt: number;
        status: 'pending' | 'processing' | 'failed';
        toastId?: string | number;
    }>>(new Map());
    const voteProcessingRef = useRef(false);
    const voteDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const MAX_RETRY_ATTEMPTS = 3;
    const BASE_RETRY_DELAY = 1000;

    // Track failed votes that need to be re-queued (for timeout recovery)
    const failedVotesRef = useRef<Map<string, VoteData>>(new Map());

    // Clear vote data on sign out
    useEffect(() => {
        if (!user) {
            setUserVotes(new Map());
            setUserVotesLoaded(false);
            console.log('🗳️ VOTING: Cleared vote state on user sign out');
        }
    }, [user]);

    // Periodic recovery check for failed votes
    useEffect(() => {
        const recoveryInterval = setInterval(() => {
            recoverFailedVotes();
        }, 15000); // Check every 15 seconds

        return () => clearInterval(recoveryInterval);
    }, []);

    // Load user votes when user signs in
    useEffect(() => {
        if (user && !userVotesLoaded) {
            console.log('🗳️ VOTING: User detected, loading user votes...');
            loadUserVotes();
        }
    }, [user, userVotesLoaded]);

    // Initialize voting stats on app launch
    useEffect(() => {
        if (!supabase) return;

        initializeVotingStats();

        // Real-time subscriptions for voting stats
        const voteChannel = supabase.channel('voting_stats')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'players'
                },
                () => {
                    setVotingStats(prev => ({
                        ...prev,
                        totalPlayers: prev.totalPlayers + 1
                    }));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'players'
                },
                (payload) => {
                    const deletedPlayer = payload.old as any;
                    const hadVotes = deletedPlayer?.vote_count && deletedPlayer.vote_count > 0;
                    setVotingStats(prev => ({
                        ...prev,
                        totalPlayers: prev.totalPlayers - 1,
                        playersVoted: hadVotes ? prev.playersVoted - 1 : prev.playersVoted
                    }));

                    if (hadVotes && deletedPlayer?.id) {
                        setPlayersWithVotes(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(deletedPlayer.id);
                            return newSet;
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_profiles'
                },
                (payload) => {
                    const newProfile = payload.new as any;
                    if (newProfile.is_verified) {
                        setVotingStats(prev => ({
                            ...prev,
                            totalVoters: prev.totalVoters + 1
                        }));
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles'
                },
                (payload) => {
                    const oldProfile = payload.old as any;
                    const newProfile = payload.new as any;

                    if (oldProfile.is_verified !== newProfile.is_verified) {
                        setVotingStats(prev => ({
                            ...prev,
                            totalVoters: newProfile.is_verified
                                ? prev.totalVoters + 1
                                : prev.totalVoters - 1
                        }));
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'user_profiles'
                },
                (payload) => {
                    const deletedProfile = payload.old as any;
                    if (deletedProfile.is_verified) {
                        setVotingStats(prev => ({
                            ...prev,
                            totalVoters: prev.totalVoters - 1
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            if (supabase && voteChannel) supabase.removeChannel(voteChannel);
        };
    }, [supabase]);

    const initializeVotingStats = async () => {
        if (!supabase) return;

        console.log('VOTING: Initializing voting stats...');

        try {
            const [playersCountResponse, playersWithVotesResponse, totalVotersResponse] = await Promise.all([
                supabase.from('players').select('id', { count: 'exact', head: true }),
                supabase.from('players').select('id', { count: 'exact', head: true }).gt('vote_count', 0),
                supabase.from('user_profiles').select('user_id', { count: 'exact', head: true }).eq('is_verified', true)
            ]);

            const totalPlayers = playersCountResponse.count || 0;
            const playersVoted = playersWithVotesResponse.count || 0;
            const totalVoters = totalVotersResponse.count || 0;

            setVotingStats({ totalPlayers, playersVoted, totalVoters });

            const playersWithVotesData = await supabase
                .from('players')
                .select('id')
                .gt('vote_count', 0);

            if (playersWithVotesData.data) {
                setPlayersWithVotes(new Set(playersWithVotesData.data.map(p => p.id)));
            }

            console.log(`VOTING: Stats initialized - ${totalPlayers} total, ${playersVoted} voted, ${totalVoters} voters`);
        } catch (error) {
            console.error('VOTING: Error initializing voting stats:', error);
        }
    };

    // Load user's personal votes (cached in provider to avoid repeated queries)
    const loadUserVotes = async (): Promise<void> => {
        if (!user || !supabase || userVotesLoaded) {
            console.log('VOTING: Skipping user votes load - no user, no supabase, or already loaded');
            return;
        }

        console.log('VOTING: Loading user votes...');
        console.time('VOTING: Load user votes');

        try {
            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (profileError || !userProfile) {
                console.error('VOTING: User profile not found:', profileError);
                return;
            }

            const { data, error } = await supabase
                .from('player_votes')
                .select('player_id, created_at, anticipation, composure, off_the_ball, vision, first_touch, passing, tackling, finishing, speed, strength, agility, workrate, crossing, positioning, technique, dribbling, decisions, marking, heading, aggression, flair, long_shots, stamina, teamwork, determination, leadership, concentration')
                .eq('voter_user_profile_id', userProfile.id);

            console.timeEnd('VOTING: Load user votes');

            if (error) {
                console.error('VOTING: Error loading user votes:', error);
                return;
            }

            console.log(`VOTING: Processing ${data?.length || 0} user votes...`);

            const votesMap = new Map();
            data?.forEach(voteRow => {
                const votes: Record<string, number> = {
                    anticipation: voteRow.anticipation || 0,
                    composure: voteRow.composure || 0,
                    offTheBall: voteRow.off_the_ball || 0,
                    vision: voteRow.vision || 0,
                    firstTouch: voteRow.first_touch || 0,
                    passing: voteRow.passing || 0,
                    tackling: voteRow.tackling || 0,
                    finishing: voteRow.finishing || 0,
                    speed: voteRow.speed || 0,
                    strength: voteRow.strength || 0,
                    agility: voteRow.agility || 0,
                    workrate: voteRow.workrate || 0,
                    crossing: voteRow.crossing || 0,
                    positioning: voteRow.positioning || 0,
                    technique: voteRow.technique || 0,
                    dribbling: voteRow.dribbling || 0,
                    decisions: voteRow.decisions || 0,
                    marking: voteRow.marking || 0,
                    heading: voteRow.heading || 0,
                    aggression: voteRow.aggression || 0,
                    flair: voteRow.flair || 0,
                    longShots: voteRow.long_shots || 0,
                    stamina: voteRow.stamina || 0,
                    teamwork: voteRow.teamwork || 0,
                    determination: voteRow.determination || 0,
                    leadership: voteRow.leadership || 0,
                    concentration: voteRow.concentration || 0
                };

                votesMap.set(voteRow.player_id, {
                    player_id: voteRow.player_id,
                    votes: votes,
                    created_at: voteRow.created_at
                });
            });

            setUserVotes(votesMap);
            setUserVotesLoaded(true);
            console.log(`VOTING: User votes cached - ${votesMap.size} votes loaded`);
        } catch (error) {
            console.error('VOTING: Error in loadUserVotes:', error);
        }
    };

    // Modern debounced vote processing with exponential backoff
    const debounceVoteProcessing = (delay = 500) => {
        if (voteDebounceTimeoutRef.current) {
            clearTimeout(voteDebounceTimeoutRef.current);
        }

        voteDebounceTimeoutRef.current = setTimeout(() => {
            processVoteQueue();
        }, delay);
    };

    // Modern vote processing with retry logic and toast feedback
    const processVoteQueue = async () => {
        if (voteProcessingRef.current || pendingVotesRef.current.size === 0) {
            return;
        }

        voteProcessingRef.current = true;
        const now = Date.now();

        try {
            const votesToProcess = Array.from(pendingVotesRef.current.entries())
                .filter(([_, vote]) => {
                    if (vote.status === 'pending') return true;
                    if (vote.status === 'failed' && vote.retryCount < MAX_RETRY_ATTEMPTS) {
                        const retryDelay = BASE_RETRY_DELAY * Math.pow(2, vote.retryCount);
                        return now - vote.lastAttempt >= retryDelay;
                    }
                    return false;
                });

            for (const [playerId, voteEntry] of votesToProcess) {
                const player = players[playerId];
                voteEntry.status = 'processing';

                try {
                    await submitVoteToDatabase(voteEntry.data);

                    if (voteEntry.toastId) {
                        toast.dismiss(voteEntry.toastId);
                    }

                    pendingVotesRef.current.delete(playerId);
                    setPlayersWithVotes(prev => new Set([...prev, playerId]));

                    setUserVotes(prev => new Map(prev.set(playerId, {
                        player_id: playerId,
                        votes: voteEntry.data.votes,
                        created_at: new Date().toISOString(),
                        isPending: false
                    })));

                    toast.success(`Vote submitted for ${player?.name || 'player'}`, {
                        duration: 2000,
                        icon: '✅'
                    });

                } catch (error) {
                    voteEntry.status = 'failed';
                    voteEntry.retryCount++;
                    voteEntry.lastAttempt = now;

                    console.error(error);

                    if (voteEntry.retryCount >= MAX_RETRY_ATTEMPTS) {
                        if (voteEntry.toastId) {
                            toast.dismiss(voteEntry.toastId);
                        }

                        pendingVotesRef.current.delete(playerId);

                        setUserVotes(prev => {
                            const updated = new Map(prev);
                            updated.delete(playerId);
                            return updated;
                        });

                        toast.error(`Failed to submit vote for ${player?.name || 'player'}`, {
                            description: error as string,
                            duration: 4000,
                            icon: '❌'
                        });
                    } else {
                        if (voteEntry.toastId) {
                            toast.dismiss(voteEntry.toastId);
                        }
                        voteEntry.toastId = toast.loading(`Retrying vote for ${player?.name || 'player'}...`, {
                            duration: 1500,
                            icon: '🔄'
                        });
                    }
                }
            }
        } finally {
            voteProcessingRef.current = false;

            const hasFailedVotes = Array.from(pendingVotesRef.current.values())
                .some(v => v.status === 'failed' && v.retryCount < MAX_RETRY_ATTEMPTS);

            if (hasFailedVotes) {
                const nextRetryDelay = BASE_RETRY_DELAY * 2;
                debounceVoteProcessing(nextRetryDelay);
            }
        }
    };

    // Database vote submission function
    const submitVoteToDatabase = async (voteData: VoteData) => {
        console.log('VOTING: submitVoteToDatabase called for player:', voteData.playerId);
        const statMapping: Record<string, string> = {
            anticipation: 'anticipation',
            composure: 'composure',
            offTheBall: 'off_the_ball',
            vision: 'vision',
            firstTouch: 'first_touch',
            passing: 'passing',
            tackling: 'tackling',
            finishing: 'finishing',
            speed: 'speed',
            strength: 'strength',
            agility: 'agility',
            workrate: 'workrate',
            crossing: 'crossing',
            positioning: 'positioning',
            technique: 'technique',
            dribbling: 'dribbling',
            decisions: 'decisions',
            marking: 'marking',
            heading: 'heading',
            aggression: 'aggression',
            flair: 'flair',
            longShots: 'long_shots',
            stamina: 'stamina',
            teamwork: 'teamwork',
            determination: 'determination',
            leadership: 'leadership',
            concentration: 'concentration'
        };

        if (!user || !user.profile) throw new Error('User not authenticated');

        const dbVoteData: any = {
            voter_user_profile_id: user.profile.id,
            player_id: voteData.playerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        for (const [frontendKey, dbColumn] of Object.entries(statMapping)) {
            const voteValue = voteData.votes[frontendKey];
            if (typeof voteValue === 'number') {
                dbVoteData[dbColumn] = voteValue;
            }
        }

        const unknownStats = Object.keys(voteData.votes).filter(key => !(key in statMapping));
        if (unknownStats.length > 0) {
            console.warn('VOTING: Vote contains unknown stats (old schema):', unknownStats, '- these will be ignored');
        }

        console.log('VOTING: Calling supabase upsert with data:', dbVoteData);
        console.time('VOTING: submitVoteToDatabase');

        const abortController = new AbortController();
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                console.error('❌ VOTING: Vote submission timed out after 10 seconds - aborting request');
                abortController.abort();
                reject(new Error('Database operation timed out after 10 seconds'));
            }, 2000);
        });

        console.log("Trying supabase upsert");

        try {
            const upsertPromise = supabase
                .from('player_votes')
                .upsert(dbVoteData, {
                    onConflict: 'player_id,voter_user_profile_id'
                })
                .abortSignal(abortController.signal);

            const { data, error } = await Promise.race([upsertPromise, timeoutPromise]);
            clearTimeout(timeoutId!);
            console.timeEnd('VOTING: submitVoteToDatabase');
            console.log('✅ VOTING: Supabase upsert completed, error:', error, 'data:', data);

            if (error) {
                console.error('❌ VOTING: Database error during upsert:', error);
                throw error;
            }

            // Success - remove from failed votes if it was there
            failedVotesRef.current.delete(voteData.playerId);
            console.log('✅ VOTING: Vote successfully submitted to database');
        } catch (err: any) {
            clearTimeout(timeoutId!);
            console.timeEnd('VOTING: submitVoteToDatabase');

            // If timeout or abort, add to failed votes for recovery
            if (err.name === 'AbortError' || err.message?.includes('timed out')) {
                failedVotesRef.current.set(voteData.playerId, voteData);
                console.error('❌ VOTING: Request aborted/timed out - added to failed queue for recovery');
            }

            console.error('❌ VOTING: Vote submission error:', err);
            throw err;
        }
    };

    // Vote submission function
    const submitVote = async (voteData: VoteData): Promise<void> => {
        try {
            const player = players[voteData.playerId];
            const toastId = toast.loading(`Submitting vote for ${player?.name || 'player'}...`, {
                icon: '⏳'
            });

            pendingVotesRef.current.set(voteData.playerId, {
                data: voteData,
                retryCount: 0,
                lastAttempt: Date.now(),
                status: 'pending',
                toastId: toastId
            });

            // Optimistic UI update
            setUserVotes(prev => new Map(prev.set(voteData.playerId, {
                player_id: voteData.playerId,
                votes: voteData.votes,
                created_at: new Date().toISOString(),
                isPending: true
            })));

            debounceVoteProcessing(500);
        } catch (error) {
            console.error('VOTING: Error queueing vote:', error);
            toast.error('Failed to queue vote', {
                description: 'Please try again',
                duration: 3000
            });
            throw error;
        }
    };

    // Recovery function to re-queue failed votes
    const recoverFailedVotes = () => {
        const failedCount = failedVotesRef.current.size;
        if (failedCount === 0) return;

        console.log(`🔄 VOTING: Recovering ${failedCount} failed votes`);

        failedVotesRef.current.forEach((voteData, playerId) => {
            // Re-add to pending queue if not already there
            if (!pendingVotesRef.current.has(playerId)) {
                const player = players[playerId];
                const toastId = toast.loading(`Recovering vote for ${player?.name || 'player'}...`, {
                    icon: '🔄'
                });

                pendingVotesRef.current.set(playerId, {
                    data: voteData,
                    retryCount: 0,
                    lastAttempt: 0,
                    status: 'pending',
                    toastId: toastId
                });
            }
        });

        failedVotesRef.current.clear();
        debounceVoteProcessing(1000);
    };

    const getPendingVoteCount = (): number => {
        return pendingVotesRef.current.size + failedVotesRef.current.size;
    };

    return (
        <VotingContext.Provider value={{
            votingStats,
            playersWithVotes,
            userVotes,
            loadUserVotes,
            submitVote,
            getPendingVoteCount,
            recoverFailedVotes,
        }}>
            {children}
        </VotingContext.Provider>
    );
};

export const useVoting = () => {
    const context = useContext(VotingContext);
    if (!context) {
        throw new Error('useVoting must be used within a VotingProvider');
    }
    return context;
};
