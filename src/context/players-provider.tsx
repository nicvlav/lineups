import React, { ReactNode, createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4, } from 'uuid';
import { handleDatabaseError } from "@/lib/session-manager";

import { openDB } from "idb";
import { defaultStatScores, PlayerStats } from "@/data/stat-types";
import { Formation, Point, Position, getPointForPosition, getThreatScore, normalizedDefaultWeights, emptyZoneScores } from "@/data/position-types";
import { Player, ScoredGamePlayer, ScoredGamePlayerWithThreat, calculateScoresForStats, GamePlayer } from "@/data/player-types";
import { /*, logPlayerStats*/ } from "@/data/auto-balance-types";
import { decodeStateFromURL } from "@/data/state-manager";
import { autoCreateTeamsScored } from "../data/auto-balance";

interface VoteData {
    playerId: string;
    votes: Record<string, number>;
}

interface VotingStats {
    totalPlayers: number;
    playersVoted: number;
    totalVoters: number;
}

interface VotingSession {
    currentPlayerId?: string; // Optional - just to remember which player we were on
    timestamp: number;
}

interface PlayersContextType {
    players: Record<string, Player>;
    gamePlayers: Record<string, ScoredGamePlayerWithThreat>;

    // Voting stats (cached and updated via real-time)
    votingStats: VotingStats;
    playersWithVotes: Set<string>;
    
    // User's personal votes (cached to avoid repeated queries)
    userVotes: Map<string, any>;
    loadUserVotes: () => Promise<void>;

    // Voting session persistence (survives page refresh)
    votingSession: VotingSession | null;
    saveVotingSession: (session: VotingSession) => void;
    loadVotingSession: () => VotingSession | null;
    clearVotingSession: () => void;
    resetVotingProgress: () => void;
    setCurrentVotingPlayer: (playerId: string) => void;
    getNextPlayerToVote: () => string | null;

    // Pending vote management
    addPendingVotedPlayer: (playerId: string) => void;
    removePendingVotedPlayer: (playerId: string) => void;
    clearPendingVotedPlayers: () => void;

    addPlayer: (player: Partial<Player>, onSuccess?: (player: Player) => void) => void;
    deletePlayer: (id: string) => void;

    // Vote submission
    submitVote: (voteData: VoteData) => Promise<void>;
    getPendingVoteCount: () => number;

    clearGame: () => void;
    addNewRealPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addNewGuestPlayerToGame: (placedTeam: string, name: string, dropX: number, dropY: number) => void;
    addExisitingPlayerToGame: (player: ScoredGamePlayerWithThreat, team: string, dropX: number, dropY: number) => void;
    removeFromGame: (playerToRemove: ScoredGamePlayerWithThreat) => void;
    switchToRealPlayer: (oldPlayer: ScoredGamePlayerWithThreat, newID: string) => void;
    switchToNewPlayer: (oldPlayer: ScoredGamePlayerWithThreat, newName: string, guest: boolean) => void;

    updateGamePlayerPosition: (gamePlayer: GamePlayer, newPosition: { x: number; y: number }) => void;

    applyFormation: (formation: Formation) => void;
    generateTeams: (filteredPlayers: Player[]) => void;
    rebalanceCurrentGame: () => void;
}

export const PlayersContext = createContext<PlayersContextType | undefined>(undefined);

const DB_NAME = "GameDB";
const STORE_NAME = "gameState";

const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        }
    });
};

const getFromDB = async (key: string) => {
    try {
        const db = await initDB();
        return db.get(STORE_NAME, key);
    } catch (error) {
        console.error('💥 IndexedDB read error:', error);
        // Only clear if it's a corruption error, not a temporary issue
        if (error instanceof Error && (error.name === 'InvalidStateError' || error.name === 'VersionError')) {
            console.warn('IndexedDB corruption detected, clearing...');
            await clearCorruptedDB();
        }
        return null;
    }
};

const saveToDB = async (key: string, value: string) => {
    try {
        const db = await initDB();
        await db.put(STORE_NAME, value, key);
    } catch (error) {
        console.error('💥 IndexedDB write error:', error);
        // Only clear if it's a corruption error, not a temporary issue
        if (error instanceof Error && (error.name === 'InvalidStateError' || error.name === 'VersionError')) {
            console.warn('IndexedDB corruption detected, clearing...');
            await clearCorruptedDB();
        }
    }
};

const clearCorruptedDB = async () => {
    try {
        console.log('🧹 Clearing corrupted IndexedDB...');
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.objectStore(STORE_NAME).clear();
        await tx.done;
        console.log('✅ IndexedDB cleared successfully');
    } catch (error) {
        console.error('❌ Failed to clear IndexedDB:', error);
        // Last resort: delete the entire database
        try {
            await indexedDB.deleteDatabase(DB_NAME);
            console.log('🗑️ IndexedDB database deleted');
        } catch (deleteError) {
            console.error('💥 Failed to delete IndexedDB:', deleteError);
        }
    }
};

interface PlayersProviderProps {
    children: ReactNode;
}

export const PlayersProvider: React.FC<PlayersProviderProps> = ({ children }) => {
    const { urlState, clearUrlState, user, ensureValidSession } = useAuth();
    const location = useLocation();

    // Routes that should NOT have game state management
    const isStaticRoute = location.pathname.startsWith('/auth') ||
        location.pathname === '/data-deletion';

    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [gamePlayers, setGamePlayers] = useState<Record<string, ScoredGamePlayerWithThreat>>({});
    
    // Voting stats - cached and updated via real-time
    const [votingStats, setVotingStats] = useState<VotingStats>({ totalPlayers: 0, playersVoted: 0, totalVoters: 0 });
    const [playersWithVotes, setPlayersWithVotes] = useState<Set<string>>(new Set());
    
    // Cache user's personal votes to avoid repeated queries
    const [userVotes, setUserVotes] = useState<Map<string, any>>(new Map());
    const [userVotesLoaded, setUserVotesLoaded] = useState(false);
    
    // Voting session persistence
    const [votingSession, setVotingSession] = useState<VotingSession | null>(null);
    
    // Track players with pending votes (just submitted but not yet in userVotes)
    // Using ref for immediate synchronous access
    const pendingVotedPlayersRef = useRef<Set<string>>(new Set());

    const loadingState = useRef(false);
    // Create unique tab key per browser tab (survives refresh but not tab sharing)
    const getOrCreateTabKey = () => {
        // First check sessionStorage for this specific tab
        let tabKey = sessionStorage.getItem("tabKey");
        
        if (!tabKey) {
            // Generate new unique key for this tab
            tabKey = `tab-${crypto.randomUUID()}`;
            sessionStorage.setItem("tabKey", tabKey);
            
            // Also store in localStorage with timestamp for cleanup (optional)
            const tabRegistry = JSON.parse(localStorage.getItem("tabRegistry") || "{}");
            tabRegistry[tabKey] = Date.now();
            localStorage.setItem("tabRegistry", JSON.stringify(tabRegistry));
            
            console.log('🆕 PLAYERS: Created new tab key:', tabKey);
        } else {
            console.log('🔄 PLAYERS: Using existing tab key:', tabKey);
        }
        
        return tabKey;
    };
    
    const tabKeyRef = useRef(getOrCreateTabKey());
    
    // Optional: Clean up old tab data on startup (prevent IndexedDB bloat)
    useEffect(() => {
        const cleanupOldTabs = async () => {
            try {
                const tabRegistry = JSON.parse(localStorage.getItem("tabRegistry") || "{}");
                const now = Date.now();
                const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000); // 1 week
                
                const activeTabKeys = Object.keys(tabRegistry);
                const oldTabKeys = activeTabKeys.filter(key => tabRegistry[key] < oneWeekAgo);
                
                if (oldTabKeys.length > 0) {
                    console.log(`🧹 PLAYERS: Cleaning up ${oldTabKeys.length} old tab keys from IndexedDB`);
                    
                    // Remove old tab data from IndexedDB
                    const db = await initDB();
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    
                    for (const oldKey of oldTabKeys) {
                        await store.delete(oldKey);
                        delete tabRegistry[oldKey];
                    }
                    
                    await tx.done;
                    localStorage.setItem("tabRegistry", JSON.stringify(tabRegistry));
                }
            } catch (error) {
                console.error('PLAYERS: Error during tab cleanup:', error);
            }
        };
        
        // Run cleanup after a short delay to avoid blocking startup
        setTimeout(cleanupOldTabs, 5000);
    }, []);

    // Vote caching system
    const pendingVotesRef = useRef<Map<string, VoteData>>(new Map());
    const voteProcessingRef = useRef(false);
    const voteDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load voting session when user changes, clear vote data on sign out
    useEffect(() => {
        if (user && !votingSession) {
            loadVotingSession();
        } else if (!user) {
            // User signed out - clear all vote-related state
            setUserVotes(new Map());
            setUserVotesLoaded(false);
            setVotingSession(null);
            pendingVotedPlayersRef.current.clear();
            console.log('🗳️ PLAYERS: Cleared vote state on user sign out');
        }
    }, [user, votingSession]);

    const loadJSONGamePlayers = async (newGamePlayers: Record<string, GamePlayer>, freshLoadedPlayers: Record<string, Player>) => {
        if (!newGamePlayers) {
            // Don't save empty state - this prevents overwriting existing game data during initialization
            setGamePlayers({});
            return;
        }

        const updatedPlayers: Record<string, ScoredGamePlayerWithThreat> = Object.fromEntries(
            Object.entries(newGamePlayers).map(([key, value]) => {
                if (!freshLoadedPlayers[value.id]) {
                    return [key, { ...value, zoneFit: structuredClone(emptyZoneScores), threatScore: 0 }];
                }

                const realPlayer = freshLoadedPlayers[value.id];
                const zoneFit = calculateScoresForStats(realPlayer.stats, normalizedDefaultWeights);
                const threatScore = getThreatScore(value.position, zoneFit, value.exactPosition);

                return [key, { ...value, zoneFit, threatScore }];
            })
        );
        saveState(updatedPlayers);
        setGamePlayers(updatedPlayers);
    };

    // Unified initialization function to prevent race conditions
    const initializeGameState = async () => {
        if (loadingState.current || !supabase) {
            return;
        }
        
        loadingState.current = true;
        
        try {
            // Initialize common dependencies first
            const freshPlayers = await fetchPlayers();
            await initializeVotingStats();
            await loadUserVotes();

            // Handle URL state first (takes precedence)
            if (urlState) {
                const currentUrl = new URL(window.location.href);
                const decoded = decodeStateFromURL(urlState);
                
                if (decoded) {
                    await loadJSONGamePlayers(decoded.gamePlayers, freshPlayers);
                    currentUrl.searchParams.delete("state");
                    window.history.replaceState({}, "", currentUrl.toString());
                }
                
                clearUrlState();
                return; // Skip IndexedDB load if URL state was processed
            }

            // Fall back to IndexedDB state
            console.log('PLAYERS: Loading game state with tab key:', tabKeyRef.current);
            const savedState = await getFromDB(tabKeyRef.current);
            if (savedState) {
                try {
                    const parsedData = JSON.parse(savedState);
                    console.log('PLAYERS: Loaded game state from IndexedDB:', parsedData.gamePlayers ? Object.keys(parsedData.gamePlayers).length : 0, 'players');
                    await loadJSONGamePlayers(parsedData.gamePlayers, freshPlayers);
                } catch (error) {
                    console.error('PLAYERS: Error loading from IndexedDB:', error);
                }
            } else {
                console.log('PLAYERS: No saved game state found in IndexedDB');
            }
        } catch (error) {
            console.error('PLAYERS: Error during game state initialization:', error);
        } finally {
            loadingState.current = false;
        }
    };

    // Initialize voting stats on app launch
    const initializeVotingStats = async () => {
        if (!supabase) return;
        
        console.log('PlayersProvider: Initializing voting stats...');
        
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

            // Also get the list of players with votes for optimistic UI
            const playersWithVotesData = await supabase
                .from('players')
                .select('id')
                .gt('vote_count', 0);
            
            if (playersWithVotesData.data) {
                setPlayersWithVotes(new Set(playersWithVotesData.data.map(p => p.id)));
            }

            console.log(`PlayersProvider: Voting stats initialized - ${totalPlayers} total, ${playersVoted} voted, ${totalVoters} voters`);
        } catch (error) {
            console.error('PlayersProvider: Error initializing voting stats:', error);
        }
    };

    // Debounced vote processing
    const debounceVoteProcessing = (delay = 1000) => {
        console.log(`debounceVoteProcessing called with delay ${delay}ms, queue size:`, pendingVotesRef.current.size);
        
        if (voteDebounceTimeoutRef.current) {
            console.log('Clearing existing vote processing timeout');
            clearTimeout(voteDebounceTimeoutRef.current);
        }
        
        voteDebounceTimeoutRef.current = setTimeout(() => {
            console.log('Vote processing timeout triggered');
            processVoteQueue();
        }, delay);
        
        console.log('Vote processing scheduled for', delay, 'ms from now');
    };

    // Load user's personal votes (cached in provider to avoid repeated queries)
    const loadUserVotes = async (): Promise<void> => {
        if (!user || !supabase || userVotesLoaded) {
            console.log('PlayersProvider: Skipping user votes load - no user, no supabase, or already loaded');
            return;
        }

        console.log('PlayersProvider: Loading user votes...');
        console.time('PlayersProvider: Load user votes');

        try {
            // First get the user profile ID
            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (profileError || !userProfile) {
                console.error('PlayersProvider: User profile not found:', profileError);
                return;
            }

            // Then get votes using the profile ID
            const { data, error } = await supabase
                .from('player_votes')
                .select('player_id, created_at, speed, vision, agility, heading, blocking, crossing, strength, tackling, teamwork, dribbling, finishing, aggression, first_touch, off_the_ball, positivity, long_passing, short_passing, communication, interceptions, composure, willing_to_switch, attack_positioning, attacking_workrate, defensive_workrate, defensive_awareness, long_shots, stamina')
                .eq('voter_user_profile_id', userProfile.id);

            console.timeEnd('PlayersProvider: Load user votes');

            if (error) {
                console.error('PlayersProvider: Error loading user votes:', error);
                return;
            }

            console.log(`PlayersProvider: Processing ${data?.length || 0} user votes...`);

            const votesMap = new Map();
            data?.forEach(voteRow => {
                // Convert database columns back to frontend format
                const votes: Record<string, number> = {
                    speed: voteRow.speed || 0,
                    vision: voteRow.vision || 0,
                    agility: voteRow.agility || 0,
                    heading: voteRow.heading || 0,
                    blocking: voteRow.blocking || 0,
                    crossing: voteRow.crossing || 0,
                    strength: voteRow.strength || 0,
                    tackling: voteRow.tackling || 0,
                    teamwork: voteRow.teamwork || 0,
                    dribbling: voteRow.dribbling || 0,
                    finishing: voteRow.finishing || 0,
                    aggression: voteRow.aggression || 0,
                    firstTouch: voteRow.first_touch || 0,
                    offTheBall: voteRow.off_the_ball || 0,
                    positivity: voteRow.positivity || 0,
                    longPassing: voteRow.long_passing || 0,
                    shortPassing: voteRow.short_passing || 0,
                    communication: voteRow.communication || 0,
                    interceptions: voteRow.interceptions || 0,
                    composure: voteRow.composure || 0,
                    willingToSwitch: voteRow.willing_to_switch || 0,
                    attackPositioning: voteRow.attack_positioning || 0,
                    attackingWorkrate: voteRow.attacking_workrate || 0,
                    defensiveWorkrate: voteRow.defensive_workrate || 0,
                    defensiveAwareness: voteRow.defensive_awareness || 0,
                    longShots: voteRow.long_shots || 0,
                    stamina: voteRow.stamina || 0
                };

                votesMap.set(voteRow.player_id, {
                    player_id: voteRow.player_id,
                    votes: votes,
                    created_at: voteRow.created_at
                });
            });

            setUserVotes(votesMap);
            setUserVotesLoaded(true);
            console.log(`PlayersProvider: User votes cached - ${votesMap.size} votes loaded`);
        } catch (error) {
            console.error('PlayersProvider: Error in loadUserVotes:', error);
        }
    };

    // Vote processing function
    const processVoteQueue = async () => {
        console.log('processVoteQueue called, processing:', voteProcessingRef.current, 'pending:', pendingVotesRef.current.size);
        
        if (voteProcessingRef.current || pendingVotesRef.current.size === 0) {
            console.log('Skipping queue processing - already running or empty queue');
            return;
        }
        
        console.log('Starting vote queue processing');
        voteProcessingRef.current = true;
        
        try {
            const votesToProcess = Array.from(pendingVotesRef.current.entries());
            
            for (const [playerId, voteData] of votesToProcess) {
                console.log(`Processing vote for player ${playerId}`);
                try {
                    await submitVoteToDatabase(voteData);
                    pendingVotesRef.current.delete(playerId);
                    
                    // Remove from pending voted players since vote is now confirmed
                    removePendingVotedPlayer(playerId);
                    
                    // Update playersWithVotes set optimistically
                    setPlayersWithVotes(prev => new Set([...prev, playerId]));
                    
                    // Update cached user votes optimistically
                    setUserVotes(prev => new Map(prev.set(playerId, {
                        player_id: playerId,
                        votes: voteData.votes,
                        created_at: new Date().toISOString(),
                        isPending: false // Mark as successfully processed
                    })));
                    
                    console.log(`Successfully submitted vote for player ${playerId}`);
                } catch (error) {
                    console.error(`Failed to submit vote for player ${playerId}:`, error);
                    // Keep in queue for retry
                }
            }
        } catch (error) {
            console.error('Error in processVoteQueue:', error);
        } finally {
            // Always reset the processing flag
            voteProcessingRef.current = false;
            console.log('Queue processing completed, remaining votes:', pendingVotesRef.current.size);
        }
        
        // If there are still votes pending, schedule another debounced processing
        if (pendingVotesRef.current.size > 0) {
            console.log(`Scheduling retry for ${pendingVotesRef.current.size} remaining votes`);
            debounceVoteProcessing(3000); // Retry after 3 seconds
        } else {
            console.log('All votes processed successfully!');
        }
    };

    // Database vote submission function
    const submitVoteToDatabase = async (voteData: VoteData) => {
        console.log('submitVoteToDatabase called for player:', voteData.playerId);
        const statMapping: Record<string, string> = {
            speed: 'speed',
            vision: 'vision',
            agility: 'agility',
            heading: 'heading',
            blocking: 'blocking',
            crossing: 'crossing',
            strength: 'strength',
            tackling: 'tackling',
            teamwork: 'teamwork',
            dribbling: 'dribbling',
            finishing: 'finishing',
            aggression: 'aggression',
            firstTouch: 'first_touch',
            offTheBall: 'off_the_ball',
            positivity: 'positivity',
            longPassing: 'long_passing',
            shortPassing: 'short_passing',
            communication: 'communication',
            interceptions: 'interceptions',
            composure: 'composure',
            willingToSwitch: 'willing_to_switch',
            attackPositioning: 'attack_positioning',
            attackingWorkrate: 'attacking_workrate',
            defensiveWorkrate: 'defensive_workrate',
            defensiveAwareness: 'defensive_awareness',
            longShots: 'long_shots',
            stamina: 'stamina'
        };

        if (!user) throw new Error('User not authenticated');

        // Ensure session is valid before critical database operation
        const sessionValid = await ensureValidSession();
        if (!sessionValid) {
            throw new Error('Session invalid - please sign in again');
        }

        // Get user profile ID first
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !userProfile) {
            throw new Error('User profile not found. Please complete verification first.');
        }

        const dbVoteData: any = {
            voter_user_profile_id: userProfile.id,
            player_id: voteData.playerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Map each stat to its database column
        for (const [frontendKey, dbColumn] of Object.entries(statMapping)) {
            const voteValue = voteData.votes[frontendKey];
            if (typeof voteValue === 'number') {
                dbVoteData[dbColumn] = voteValue;
            }
        }

        // Always do upsert to handle both insert and update cases
        console.log('Calling supabase upsert...');
        
        // Add timeout to prevent hanging (increased for batch processing)
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Database operation timed out')), 30000)
        );
        
        const upsertPromise = supabase
            .from('player_votes')
            .upsert(dbVoteData, {
                onConflict: 'player_id,voter_user_profile_id'
            });
        
        try {
            const { error } = await Promise.race([upsertPromise, timeoutPromise]);
            console.log('Supabase upsert completed, error:', error);
            
            if (error) throw error;
        } catch (err) {
            // Handle both timeout errors and database errors
            console.error('Vote submission error:', err);
            throw err;
        }
    };


    // Real-time updates for players
    useEffect(() => {
        // Skip game state management on static routes
        if (isStaticRoute) {
            return;
        }

        // Initialize game state without aggressive timeouts
        initializeGameState().catch(error => {
            console.error('PLAYERS: Game state initialization failed:', error);
            // Don't reload - just log the error and continue
            // Game state will be rebuilt on next user interaction
        });

        // Create a channel for realtime subscriptions - listen to both players and vote aggregates
        const playerChannel = supabase?.channel('players_and_votes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'players'
                },
                (payload) => {
                    if (loadingState.current) return;

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        const newPlayer = payload.new as any;
                        // Convert individual stats for new players
                        newPlayer.stats = convertIndividualStatsToPlayerStats(newPlayer);
                        newPlayer.vote_count = 0;
                        newPlayer.aggregates = null;
                        newPlayers[newPlayer.id] = newPlayer;
                        return newPlayers;
                    });

                    // Update voting stats - increment total players
                    setVotingStats(prev => ({
                        ...prev,
                        totalPlayers: prev.totalPlayers + 1
                    }));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'players'
                },
                (payload) => {
                    if (loadingState.current) return;

                    const id = payload.new.id;


                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        const updatedPlayer = payload.new as any;
                        // const existingPlayer = prevPlayers[id];

                        // // Preserve community stats if they exist, otherwise use individual stats
                        // if (existingPlayer && existingPlayer.vote_count > 0) {
                        //     updatedPlayer.stats = existingPlayer.stats; // Keep community stats
                        //     updatedPlayer.vote_count = existingPlayer.vote_count;
                        //     updatedPlayer.aggregates = existingPlayer.aggregates;
                        // } else {
                        updatedPlayer.stats = convertIndividualStatsToPlayerStats(updatedPlayer);
                        updatedPlayer.vote_count = 0;
                        updatedPlayer.aggregates = null;
                        // }

                        newPlayers[id] = updatedPlayer;
                        return newPlayers;
                    });
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
                    if (loadingState.current) return;

                    const deletedPlayer = payload.old as Partial<Player>;
                    const id: string | undefined = deletedPlayer?.id;

                    if (!id) return;

                    setPlayers(prevPlayers => {
                        const newPlayers = { ...prevPlayers };
                        if (id in newPlayers) delete newPlayers[id];
                        return newPlayers;
                    });

                    setGamePlayers(prevGamePlayers => {
                        const newGamePlayers = { ...prevGamePlayers };
                        if (id in newGamePlayers) delete newGamePlayers[id];
                        return newGamePlayers;
                    });

                    // Update voting stats - decrement total players and check if had votes
                    const hadVotes = deletedPlayer?.vote_count && deletedPlayer.vote_count > 0;
                    setVotingStats(prev => ({
                        ...prev,
                        totalPlayers: prev.totalPlayers - 1,
                        playersVoted: hadVotes ? prev.playersVoted - 1 : prev.playersVoted
                    }));

                    // Remove from playersWithVotes set
                    if (hadVotes) {
                        setPlayersWithVotes(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(id);
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
                    
                    // Check if verification status changed
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

        // Cleanup the subscription when the component unmounts
        return () => {
            if (supabase && playerChannel) supabase.removeChannel(playerChannel);
        };
    }, [supabase, location.pathname, isStaticRoute]);


    // Remove duplicate URL state effect since it's handled in unified initialization
    useEffect(() => {
        // Skip URL state management on static routes
        if (isStaticRoute) return;

        // Only re-initialize if urlState changes and we have a new urlState
        if (urlState && !loadingState.current) {
            initializeGameState();
        }
    }, [urlState, isStaticRoute]);

    const fetchPlayers = async (): Promise<Record<string, Player>> => {
        if (!supabase) {
            console.log('📊 PLAYERS: No Supabase client available');
            return {};
        }

        console.log('📊 PLAYERS: Starting player fetch...');
        loadingState.current = true;

        try {
            const { data, error } = await supabase
                .from("players")
                .select(`
                    id,
                    name,
                    vote_count,
                    speed_avg,
                    vision_avg,
                    agility_avg,
                    heading_avg,
                    blocking_avg,
                    crossing_avg,
                    strength_avg,
                    stamina_avg,
                    tackling_avg,
                    teamwork_avg,
                    dribbling_avg,
                    finishing_avg,
                    long_shots_avg,
                    aggression_avg,
                    first_touch_avg,
                    off_the_ball_avg,
                    positivity_avg,
                    long_passing_avg,
                    short_passing_avg,
                    communication_avg,
                    interceptions_avg,
                    composure_avg,
                    willing_to_switch_avg,
                    attack_positioning_avg,
                    attacking_workrate_avg,
                    defensive_workrate_avg,
                    defensive_awareness_avg,
                    long_shots_avg,
                    stamina_avg,
                    created_at,
                    updated_at
                `)
                .order("name", { ascending: false });
                
            if (error) {
                console.error("❌ PLAYERS: Error fetching players:", error);
                loadingState.current = false;
                
                // Use intelligent error handling instead of aggressive clearing
                const recovery = await handleDatabaseError(error, 'fetch players', user?.id);
                
                if (recovery.shouldSignOut) {
                    console.log('🚪 PLAYERS: Critical error, signing out...');
                    // Let auth context handle the sign out
                    return {};
                }
                
                if (recovery.shouldRetry) {
                    console.log(`🔄 PLAYERS: Will retry fetching players in ${recovery.retryAfter || 5} seconds...`);
                    // Could implement retry logic here if needed
                }
                
                return {};
            }

            if (!data || data.length === 0) {
                console.warn('⚠️ PLAYERS: No players found in database');
                // This might indicate a database issue or permissions problem
                return {};
            }

            console.log(`✅ PLAYERS: Fetched ${data.length} players successfully`);

            const playerRecord: Record<string, Player> = {};
            data.forEach(player => {
                try {
                    // Use community-voted stats if available, otherwise fall back to individual stat columns (0-10 scale converted to 0-100)
                    const effectiveStats = convertIndividualStatsToPlayerStats(player);

                    playerRecord[player.id] = {
                        ...player,
                        stats: effectiveStats,
                        // Store aggregate info for reference
                        vote_count: player.vote_count || 0,
                    };
                } catch (statError) {
                    console.error(`❌ PLAYERS: Error processing player ${player.name}:`, statError);
                }
            });

            setPlayers(playerRecord); // still set state for global use
            console.log(`📊 PLAYERS: Player fetch complete, ${Object.keys(playerRecord).length} players processed`);

            loadingState.current = false;
            return playerRecord; // return immediately for local use
        } catch (unexpectedError) {
            console.error('💥 PLAYERS: Unexpected error during player fetch:', unexpectedError);
            loadingState.current = false;
            
            // Don't clear IndexedDB on unexpected errors - preserve game data
            return {};
        }
    };

    // Convert aggregated averages to 0-100 stat scores
    // const calculateCommunityStats = (aggregates: any): PlayerStats => {
    //     const communityStats = { ...defaultStatScores };

    //     // Map database column names to stat keys and convert 0-10 averages to 0-100 scale
    //     const statMapping: Record<string, keyof PlayerStats> = {
    //         speed_avg: 'speed',
    //         vision_avg: 'vision',
    //         agility_avg: 'agility',
    //         heading_avg: 'heading',
    //         blocking_avg: 'blocking',
    //         crossing_avg: 'crossing',
    //         strength_avg: 'strength',
    //         tackling_avg: 'tackling',
    //         teamwork_avg: 'teamwork',
    //         dribbling_avg: 'dribbling',
    //         finishing_avg: 'finishing',
    //         aggression_avg: 'aggression',
    //         first_touch_avg: 'firstTouch',
    //         off_the_ball_avg: 'offTheBall',
    //         positivity_avg: 'positivity',
    //         long_passing_avg: 'longPassing',
    //         short_passing_avg: 'shortPassing',
    //         communication_avg: 'communication',
    //         interceptions_avg: 'interceptions',
    //         composure_avg: 'pressResistance',
    //         willing_to_switch_avg: 'willingToSwitch',
    //         attack_positioning_avg: 'attackPositioning',
    //         attacking_workrate_avg: 'attackingWorkrate',
    //         defensive_workrate_avg: 'defensiveWorkrate',
    //         defensive_awareness_avg: 'defensiveAwareness'
    //     };

    //     for (const [dbColumn, statKey] of Object.entries(statMapping)) {
    //         const avgValue = aggregates[dbColumn];
    //         if (typeof avgValue === 'number') {
    //             // Convert 0-10 average to 0-100 scale
    //             communityStats[statKey] = Math.round(avgValue * 10);
    //         }
    //     }

    //     return communityStats;
    // };

    // Convert PlayerStats (0-100) to individual stat columns (0-10) for database insert
    const convertPlayerStatsToIndividualColumns = (stats: PlayerStats) => {
        return {
            speed_avg: Math.round(stats.speed / 10),
            vision_avg: Math.round(stats.vision / 10),
            agility_avg: Math.round(stats.agility / 10), 
            heading_avg: Math.round(stats.heading / 10),
            blocking_avg: Math.round(stats.blocking / 10),
            crossing_avg: Math.round(stats.crossing / 10),
            strength_avg: Math.round(stats.strength / 10), 
            stamina_avg: Math.round(stats.stamina / 10),
            tackling_avg: Math.round(stats.tackling / 10),
            teamwork_avg: Math.round(stats.teamwork / 10),
            dribbling_avg: Math.round(stats.dribbling / 10),
            finishing_avg: Math.round(stats.finishing / 10),
            long_shots_avg: Math.round(stats.longShots / 10),
            aggression_avg: Math.round(stats.aggression / 10),
            first_touch_avg: Math.round(stats.firstTouch / 10),
            off_the_ball_avg: Math.round(stats.offTheBall / 10),
            positivity_avg: Math.round(stats.positivity / 10),
            long_passing_avg: Math.round(stats.longPassing / 10),
            short_passing_avg: Math.round(stats.shortPassing / 10),
            communication_avg: Math.round(stats.communication / 10),
            interceptions_avg: Math.round(stats.interceptions / 10),
            composure_avg: Math.round(stats.composure / 10),
            willing_to_switch_avg: Math.round(stats.willingToSwitch / 10),
            attack_positioning_avg: Math.round(stats.attackPositioning / 10),
            attacking_workrate_avg: Math.round(stats.attackingWorkrate / 10),
            defensive_workrate_avg: Math.round(stats.defensiveWorkrate / 10),
            defensive_awareness_avg: Math.round(stats.defensiveAwareness / 10),
        };
    };

    // Convert individual player stat columns (0-10) to PlayerStats (0-100)
    const convertIndividualStatsToPlayerStats = (player: any): PlayerStats => {
        const stats = { ...defaultStatScores };

        // Map database AGGREGATE column names to stat keys and convert 0-10 to 0-100 scale
        const statMapping: Record<string, keyof PlayerStats> = {
            speed_avg: 'speed',
            vision_avg: 'vision',
            agility_avg: 'agility',
            heading_avg: 'heading',
            blocking_avg: 'blocking',
            crossing_avg: 'crossing',
            strength_avg: 'strength',
            tackling_avg: 'tackling',
            teamwork_avg: 'teamwork',
            dribbling_avg: 'dribbling',
            finishing_avg: 'finishing',
            aggression_avg: 'aggression',
            first_touch_avg: 'firstTouch',
            off_the_ball_avg: 'offTheBall',
            positivity_avg: 'positivity',
            long_passing_avg: 'longPassing',
            short_passing_avg: 'shortPassing',
            communication_avg: 'communication',
            interceptions_avg: 'interceptions',
            composure_avg: 'composure',
            willing_to_switch_avg: 'willingToSwitch',
            attack_positioning_avg: 'attackPositioning',
            attacking_workrate_avg: 'attackingWorkrate',
            defensive_workrate_avg: 'defensiveWorkrate',
            defensive_awareness_avg: 'defensiveAwareness',
            long_shots_avg: 'longShots',
            stamina_avg: 'stamina'
        };

        for (const [dbColumn, statKey] of Object.entries(statMapping)) {
            const value = player[dbColumn];
            if (typeof value === 'number' && value > 0) {
                // Convert 0-10 to 0-100 scale, only if value > 0 (has votes)
                stats[statKey] = value * 10;
            } else if (typeof value === 'string') {
                // Handle string numbers from database
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > 0) {
                    stats[statKey] = numValue * 10;
                }
            }
        }

        return stats;
    };

    useEffect(() => {
        // Skip auto-save on static routes
        if (isStaticRoute) return;

        // Skip saving empty state during initial load - only save when we have actual players
        if (!loadingState.current && Object.keys(gamePlayers).length > 0) {
            // console.log("Saving state from change:", gamePlayers);
            saveState(gamePlayers);
        }
    }, [gamePlayers, isStaticRoute]);

    const saveState = async (gamePlayersToSave: Record<string, ScoredGamePlayerWithThreat>) => {
        const stateObject = { gamePlayers: gamePlayersToSave };
        console.log('PLAYERS: Saving game state with tab key:', tabKeyRef.current, 'players:', Object.keys(gamePlayersToSave).length);
        await saveToDB(tabKeyRef.current, JSON.stringify(stateObject));
    };

    // optional lamda to call on success
    const addPlayer = async (player: Partial<Player>, onSuccess?: (player: Player) => void) => {
        if (!supabase) return;

        if (player.id != null && player.id in players) return;

        const playerStats = player.stats ? player.stats : defaultStatScores;
        const newPlayer: Player = {
            id: player.id ? player.id : uuidv4(),
            name: player.name ? player.name : "Player Name",
            vote_count: 0,
            stats: playerStats,
        };

        // Convert stats to individual columns for database
        const individualColumns = convertPlayerStatsToIndividualColumns(playerStats);

        supabase.from('players')
            .insert([{
                id: newPlayer.id,
                name: newPlayer.name,
                vote_count: 0,
                ...individualColumns
            }]).then(({ data, error }) => {
                if (error) {
                    // Rollback local state if there's an error
                    console.error('Error adding player:', error.message);
                    // setPlayers((prevPlayers) => prevPlayers.filter(player => player.id !== newUID));
                } else {
                    console.log('Adding player:', data);
                    // console.log('Player added successfully:', data);
                    onSuccess?.(newPlayer);
                }
            });
    };

    const deletePlayer = async (id: string) => {
        if (!supabase) return;

        supabase.from('players')
            .delete()
            .match({ id }).then(({ data, error }) => {
                if (error) {
                    // Rollback local state if there's an error
                    console.error('Error deleting player:', error.message);
                } else {
                    console.log('Player deleted successfully:', data);
                }
            });
    };



    // Clear game data
    const clearGame = async () => {
        setGamePlayers({});
    };

    // Add real player to game
    const addExisitingPlayerToGame = async (player: ScoredGamePlayerWithThreat, team: string, dropX: number, dropY: number) => {
        if (player.id in gamePlayers) {
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                const position = { x: dropX, y: dropY };
                newGamePlayers[player.id] = {
                    ...newGamePlayers[player.id],
                    team,
                    position,
                    threatScore: getThreatScore(position, newGamePlayers[player.id].zoneFit, newGamePlayers[player.id].exactPosition)
                };
                return newGamePlayers;
            });
        }
    };

    const addNewRealPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();

        addPlayer({ id: newID, name }, () => {
            if (!(newID in players)) return;

            const position = { x: dropX, y: dropY } as Point;
            const zoneFit = calculateScoresForStats(players[newID].stats, normalizedDefaultWeights);

            const gamePlayer: ScoredGamePlayerWithThreat = {
                id: newID, team: placedTeam,
                guest_name: null,
                position,
                zoneFit,
                threatScore: getThreatScore(position, zoneFit, null)
            };
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[gamePlayer.id] = gamePlayer;
                return newGamePlayers;
            });
        });
    };

    const addNewGuestPlayerToGame = async (placedTeam: string, name: string, dropX: number, dropY: number) => {
        const newID = uuidv4();
        const position = { x: dropX, y: dropY } as Point;
        const zoneFit = structuredClone(emptyZoneScores);

        const gamePlayer: ScoredGamePlayerWithThreat = { id: newID, team: placedTeam, guest_name: name, position, zoneFit, threatScore: getThreatScore(position, zoneFit) };
        setGamePlayers(prevGamePlayers => {
            const newGamePlayers = { ...prevGamePlayers };
            newGamePlayers[gamePlayer.id] = gamePlayer;
            return newGamePlayers;
        });
    };

    const removeFromGame = async (playerToRemove: ScoredGamePlayerWithThreat) => {
        setGamePlayers(prevGamePlayers => {
            const newGamePlayers = { ...prevGamePlayers };
            delete newGamePlayers[playerToRemove.id];
            return newGamePlayers;
        });
    };

    const switchToRealPlayer = async (oldPlayer: ScoredGamePlayerWithThreat, newID: string) => {
        // No need to switch if IDs are the same
        // This function has these requirements:
        // old player MUST be in the game already
        // newID MUST belond to an existing player (doesnt have to be in game)
        if (oldPlayer.id === newID || !(oldPlayer.id in gamePlayers) || !(newID in players)) return;

        if (newID in gamePlayers) {
            const newPlayer = gamePlayers[newID];

            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[oldPlayer.id] = { ...oldPlayer, team: newPlayer.team, position: newPlayer.position, threatScore: getThreatScore(newPlayer.position, oldPlayer.zoneFit, oldPlayer.exactPosition) };
                newGamePlayers[newID] = { ...newPlayer, team: oldPlayer.team, position: oldPlayer.position, threatScore: getThreatScore(oldPlayer.position, newPlayer.zoneFit, newPlayer.exactPosition) };
                return newGamePlayers;
            });
        } else {
            const newPlayer = players[newID];
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                const zoneFit = calculateScoresForStats(newPlayer.stats, normalizedDefaultWeights);
                newGamePlayers[newID] = { id: newPlayer.id, guest_name: null, team: oldPlayer.team, position: oldPlayer.position, zoneFit, threatScore: getThreatScore(oldPlayer.position, zoneFit, oldPlayer.exactPosition) };
                delete newGamePlayers[oldPlayer.id];
                return newGamePlayers;
            });
        }
    };

    // this switches an existing game player to a brand new player entry
    const switchToNewPlayer = async (oldPlayer: ScoredGamePlayerWithThreat, newName: string, guest: boolean = false) => {
        // old player MUST be in the game already
        if (!(oldPlayer.id in gamePlayers)) return;

        if (guest) {
            // setGamePlayers(prevGamePlayers => {
            //     const newGamePlayers = { ...prevGamePlayers };
            //     newGamePlayers[newID] = { id: uuidv4(), guest_name: newName, team: oldPlayer.team, position: oldPlayer.position };
            //     delete newGamePlayers[oldPlayer.id];
            //     return newGamePlayers;
            // });
            // return;
        }

        const newID = uuidv4();

        addPlayer({ id: newID, name: newName }, () => {
            if (!(newID in players)) return;

            const zoneFit = calculateScoresForStats(players[newID].stats, normalizedDefaultWeights);

            const gamePlayer: ScoredGamePlayerWithThreat = {
                id: newID,
                team: oldPlayer.team,
                guest_name: null,
                position: oldPlayer.position,
                zoneFit,
                threatScore: getThreatScore(oldPlayer.position, zoneFit, oldPlayer.exactPosition)
            };
            setGamePlayers(prevGamePlayers => {
                const newGamePlayers = { ...prevGamePlayers };
                newGamePlayers[gamePlayer.id] = gamePlayer;
                delete newGamePlayers[oldPlayer.id];
                return newGamePlayers;
            });
        });
    };


    const applyFormationToTeam = (team: string, formation: Formation) => {
        const teamPlayers = Object.values(gamePlayers).filter((player) => player.team === team);
        const newTeamPlayers: Record<string, ScoredGamePlayerWithThreat> = {};

        for (const [key, value] of Object.entries(formation.positions)) {
            for (let i = 0; i < value; i++) {
                // key is a string
                // value is of type 'unknown' by default — you can cast it
                const player = teamPlayers.shift();
                const position = getPointForPosition(normalizedDefaultWeights[key as Position], i, value, formation);

                if (player) {
                    const exactPosition = key as Position; // Set exact position for formations
                    const threatScore = getThreatScore(position, player.zoneFit, exactPosition);
                    newTeamPlayers[player.id] = {
                        ...player,
                        team,
                        position,
                        exactPosition,
                        threatScore
                    }
                } else {
                    const newID = uuidv4();
                    const zoneFit = structuredClone(emptyZoneScores);
                    const exactPosition = key as Position;
                    newTeamPlayers[newID] = {
                        id: newID,
                        guest_name: "[Player]",
                        team,
                        position,
                        zoneFit,
                        exactPosition,
                        threatScore: getThreatScore(position, zoneFit, exactPosition)
                    }
                }
            }

        }

        return newTeamPlayers;

    };

    const applyFormation = async (formation: Formation) => {
        const teamA = applyFormationToTeam("A", formation);
        const teamB = applyFormationToTeam("B", formation);

        // Ensure a new reference and trigger state update
        setGamePlayers({ ...teamA, ...teamB });
    };

    const handleGenerateTeams = async (gamePlayersWithScores: ScoredGamePlayerWithThreat[]) => {
        let teamA: ScoredGamePlayer[] = [];
        let teamB: ScoredGamePlayer[] = [];

        // logPlayerStats(gamePlayers, players);

        try {
            const balanced = autoCreateTeamsScored(gamePlayersWithScores);
            teamA = balanced.a;
            teamB = balanced.b;
        } catch (error) {
            return;
        }

        const playerRecord: Record<string, ScoredGamePlayerWithThreat> = {};
        teamA.forEach(player => {
            playerRecord[player.id] = { ...player, threatScore: getThreatScore(player.position, player.zoneFit, player.exactPosition) };
        });
        teamB.forEach(player => {
            playerRecord[player.id] = { ...player, threatScore: getThreatScore(player.position, player.zoneFit, player.exactPosition) };
        });

        setGamePlayers(playerRecord);
    };

    const generateTeams = async (filteredPlayers: Player[]) => {
        const normalizedWeights = normalizedDefaultWeights;
        handleGenerateTeams(filteredPlayers.map(player => {
            const position = { x: 0.5, y: 0.5 } as Point;
            const zoneFit = calculateScoresForStats(player.stats, normalizedWeights);
            return {
                id: player.id,
                guest_name: null,
                team: "A",
                position: position,
                zoneFit: zoneFit,
                threatScore: 0
            } as ScoredGamePlayerWithThreat;
        }));
    };

    const rebalanceCurrentGame = async () => {
        // Filter players in the current game
        const filteredPlayers: ScoredGamePlayerWithThreat[] = [];

        Object.entries(gamePlayers).forEach(([id, player]) => {
            if (!(id in players)) return;

            filteredPlayers.push(player);
        });

        // Call generateTeams with the filtered players
        await handleGenerateTeams(filteredPlayers);
    };

    // Vote submission functions
    const submitVote = async (voteData: VoteData): Promise<void> => {
        try {
            // Immediately add to pending voted players to exclude from next player selection
            addPendingVotedPlayer(voteData.playerId);
            
            // Add to pending queue
            pendingVotesRef.current.set(voteData.playerId, voteData);
            
            // Use debounced processing to batch votes
            debounceVoteProcessing(1000); // Wait 1 second for more votes before processing
        } catch (error) {
            console.error('Error queueing vote:', error);
            throw error;
        }
    };

    const getPendingVoteCount = (): number => {
        return pendingVotesRef.current.size;
    };

    // Voting session persistence functions
    const saveVotingSession = (session: VotingSession) => {
        if (!user) return;
        
        try {
            localStorage.setItem(`voting_session_${user.id}`, JSON.stringify(session));
            setVotingSession(session);
        } catch (error) {
            console.error('Error saving voting session:', error);
        }
    };

    const loadVotingSession = (): VotingSession | null => {
        if (!user) return null;
        
        try {
            const stored = localStorage.getItem(`voting_session_${user.id}`);
            if (!stored) return null;
            
            const session: VotingSession = JSON.parse(stored);
            
            // Check if session is recent (within 24 hours)
            if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(`voting_session_${user.id}`);
                return null;
            }
            
            setVotingSession(session);
            return session;
        } catch (error) {
            console.error('Error loading voting session:', error);
            return null;
        }
    };

    const clearVotingSession = () => {
        if (!user) return;
        
        try {
            localStorage.removeItem(`voting_session_${user.id}`);
            setVotingSession(null);
        } catch (error) {
            console.error('Error clearing voting session:', error);
        }
    };

    const resetVotingProgress = () => {
        if (!user) return;
        
        try {
            // Clear current player selection
            const resetSession: VotingSession = {
                currentPlayerId: undefined,
                timestamp: Date.now()
            };
            
            localStorage.setItem(`voting_session_${user.id}`, JSON.stringify(resetSession));
            setVotingSession(resetSession);
        } catch (error) {
            console.error('Error resetting voting progress:', error);
        }
    };

    const setCurrentVotingPlayer = (playerId: string) => {
        if (!user) return;
        
        try {
            const session: VotingSession = {
                currentPlayerId: playerId,
                timestamp: Date.now()
            };
            
            localStorage.setItem(`voting_session_${user.id}`, JSON.stringify(session));
            setVotingSession(session);
        } catch (error) {
            console.error('Error setting current voting player:', error);
        }
    };

    const getNextPlayerToVote = (): string | null => {
        if (!user) return null;
        
        const allPlayers = Object.values(players);
        
        const eligiblePlayers = allPlayers.filter(player => {
            const isAssociatedPlayer = user?.profile?.associated_player_id === player.id;
            const hasUserVoted = userVotes.has(player.id);
            const isPendingVote = pendingVotedPlayersRef.current.has(player.id);
            return !isAssociatedPlayer && !hasUserVoted && !isPendingVote;
        });

        if (eligiblePlayers.length === 0) return null;

        // Sort by vote count (ascending - lowest first), then randomize for equal counts
        const sortedPlayers = eligiblePlayers.sort((a, b) => {
            const voteCountA = a.vote_count || 0;
            const voteCountB = b.vote_count || 0;
            
            if (voteCountA !== voteCountB) {
                return voteCountA - voteCountB;
            }
            
            // For players with equal vote counts, randomize their order
            return Math.random() - 0.5;
        });

        return sortedPlayers[0].id;
    };

    // Manage pending voted players (just submitted but not yet reflected in userVotes)
    const addPendingVotedPlayer = (playerId: string) => {
        pendingVotedPlayersRef.current.add(playerId);
    };

    const removePendingVotedPlayer = (playerId: string) => {
        pendingVotedPlayersRef.current.delete(playerId);
    };

    const clearPendingVotedPlayers = () => {
        pendingVotedPlayersRef.current.clear();
    };

    // Update game player position (for drag-and-drop)
    const updateGamePlayerPosition = (gamePlayer: GamePlayer, newPosition: { x: number; y: number }) => {
        const playerId = gamePlayer.id;
        if (!playerId) return;

        setGamePlayers(prev => {
            const updated = { ...prev };
            if (updated[playerId]) {
                updated[playerId] = {
                    ...updated[playerId],
                    position: newPosition
                };
            }
            return updated;
        });
    };

    return (
        <PlayersContext.Provider value={{
            players,
            gamePlayers,

            // Voting stats (cached and updated via real-time)
            votingStats,
            playersWithVotes,
            
            // User's personal votes (cached to avoid repeated queries)
            userVotes,
            loadUserVotes,

            // Voting session persistence (survives page refresh)
            votingSession,
            saveVotingSession,
            loadVotingSession,
            clearVotingSession,
            resetVotingProgress,
            setCurrentVotingPlayer,
            getNextPlayerToVote,

            // Pending vote management
            addPendingVotedPlayer,
            removePendingVotedPlayer,
            clearPendingVotedPlayers,

            addPlayer,
            deletePlayer,
            
            // Vote submission
            submitVote,
            getPendingVoteCount,

            addExisitingPlayerToGame,
            removeFromGame,
            addNewRealPlayerToGame,
            addNewGuestPlayerToGame,
            switchToRealPlayer,
            switchToNewPlayer,

            updateGamePlayerPosition,

            applyFormation,
            clearGame,
            generateTeams,
            rebalanceCurrentGame,
        }}>
            {children}
        </PlayersContext.Provider>
    );
};

export const usePlayers = () => {
    const context = useContext(PlayersContext);
    if (!context) {
        throw new Error('usePlayers must be used within a PlayersProvider');
    }
    return context;
};