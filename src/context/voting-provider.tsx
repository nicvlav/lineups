import React, { createContext, ReactNode, useContext } from "react";
import { usePlayersWithVotes, useSubmitVote, useUserVotes, useVotingStats } from "@/hooks/use-voting";

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
    // Voting stats
    votingStats: VotingStats;
    playersWithVotes: Set<string>;

    // User's personal votes
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
    // Use React Query hooks
    const { data: votingStats = { totalPlayers: 0, playersVoted: 0, totalVoters: 0 } } = useVotingStats();
    const { data: playersWithVotes = new Set<string>() } = usePlayersWithVotes();
    const { data: userVotes = new Map(), refetch: refetchUserVotes } = useUserVotes();
    const submitVoteMutation = useSubmitVote();

    // Load user votes (for backwards compatibility)
    const loadUserVotes = async (): Promise<void> => {
        await refetchUserVotes();
    };

    // Submit vote
    const submitVote = async (voteData: VoteData): Promise<void> => {
        await submitVoteMutation.mutateAsync(voteData);
    };

    // Get pending vote count (React Query tracks this internally)
    const getPendingVoteCount = (): number => {
        return submitVoteMutation.isPending ? 1 : 0;
    };

    // Recovery is handled automatically by React Query's retry logic
    const recoverFailedVotes = () => {
        // No-op: React Query handles retries automatically
        console.log("🔄 VOTING: Recovery handled automatically by React Query");
    };

    return (
        <VotingContext.Provider
            value={{
                votingStats,
                playersWithVotes,
                userVotes,
                loadUserVotes,
                submitVote,
                getPendingVoteCount,
                recoverFailedVotes,
            }}
        >
            {children}
        </VotingContext.Provider>
    );
};

export const useVoting = () => {
    const context = useContext(VotingContext);
    if (!context) {
        throw new Error("useVoting must be used within a VotingProvider");
    }
    return context;
};
