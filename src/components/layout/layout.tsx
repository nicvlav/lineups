import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { PlayersProvider } from "@/context/players-provider";
import { GameProvider } from "@/context/game-provider";
import { VotingProvider } from "@/context/voting-provider";
import { PitchAnimationProvider } from "@/context/pitch-animation-context";
import HeaderBar from "@/components/layout/header-bar";
import { SquadIdVerification } from "@/components/auth/dialogs/squad-id-verification";
import { PlayerAssignment } from "@/components/auth/dialogs/player-assignment";
import { useLocation } from 'react-router-dom';

import Game from "@/components/game/game";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayerCards from "@/components/players/player-cards";
import TeamGenerator from "@/components/game/team-generator";
import VotingPage from "@/components/voting/voting-page";
import PlayerManager from "@/components/admin/player-manager";
import SignInPage from "@/components/auth/pages/sign-in";
import SignUpPage from "@/components/auth/pages/sign-up";
import ResetPasswordPage from "@/components/auth/pages/reset-password";
import UpdatePasswordPage from "@/components/auth/pages/update-password";
import AuthDebugPage from "@/components/auth/pages/debug";
import AuthCallbackPage from "@/components/auth/pages/callback";
import DataDeletionPage from "@/components/auth/pages/data-deletion";

const LayoutContent = () => {
    const { needsVerification, user } = useAuth();
    const location = useLocation();

    // Detect if we're on staging
    const isStaging = window.location.hostname.includes('staging');

    const canVote = user !== null;

    // Check if current route is an auth route
    const isAuthRoute = location.pathname.startsWith('/auth');

    const useWindowSize = () => {
        const [windowSize, setWindowSize] = useState({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        useEffect(() => {
            const handleResize = () => {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            };

            window.addEventListener("resize", handleResize);

            // Initial resize on mount
            handleResize();

            // Cleanup the event listener on unmount
            return () => window.removeEventListener("resize", handleResize);
        }, []);

        return windowSize;
    };

    const { width } = useWindowSize();

    // Responsive layout based on viewport width
    const isCompact = width < 768;

    return (
        <PitchAnimationProvider>
            <PlayersProvider>
                <GameProvider>
                    <VotingProvider>
                    {/* Staging environment banner */}
                    {isStaging && (
                        <div className="bg-linear-to-r from-orange-500 to-red-500 text-white text-center py-1 px-4 text-sm font-medium z-50 relative">
                            🚧 STAGING ENVIRONMENT - For Testing Only 🚧
                        </div>
                    )}

                    {/* Conditionally show header - not on auth routes */}
                    {!isAuthRoute && (
                        <div className="sticky top-0 z-50">
                            <HeaderBar compact={isCompact} />
                        </div>
                    )}

                    {/* Main content area */}
                    <main className="flex-1 overflow-auto">
                        <Routes>
                            {/* Auth routes - accessible to all */}
                            <Route path="auth/sign-in" element={<SignInPage />} />
                            <Route path="auth/sign-up" element={<SignUpPage />} />
                            <Route path="auth/reset-password" element={<ResetPasswordPage />} />
                            <Route path="auth/update-password" element={<UpdatePasswordPage />} />
                            <Route path="auth/callback" element={<AuthCallbackPage />} />
                            <Route path="auth/debug" element={<AuthDebugPage />} />
                            <Route path="data-deletion" element={<DataDeletionPage />} />

                            {/* App routes */}
                            <Route index element={<Game isCompact={isCompact} playerSize={(() => {
                                return isCompact ? (width < 400 ? 40 : 60) : 70;
                            })()} />} />
                            <Route path="cards" element={<PlayerCards />} />
                            <Route path="generate" element={<TeamGenerator isCompact={isCompact} />} />
                            {canVote && <Route path="vote" element={<VotingPage />} />}
                            {!canVote && <Route path="vote" element={<Navigate to="/" />} />}

                            {/* Admin routes - only for verified users */}
                            {canVote && <Route path="admin/players" element={<PlayerManager />} />}
                            {!canVote && <Route path="admin/players" element={<Navigate to="/" />} />}

                            {/* Catch all - redirect to home */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>

                    {/* Verification dialogs for users who need them */}
                    {user && needsVerification && !isAuthRoute && (
                        <>
                            {/* Step 1: Squad ID verification (if no squad_id) */}
                            {!user.profile?.squad_id && (
                                <SquadIdVerification
                                    open={true}
                                    onClose={() => { }}
                                    mandatory={true}
                                />
                            )}

                            {/* Step 2: Player assignment (if has squad_id but not fully verified) */}
                            {user.profile?.squad_id && !user.profile?.is_verified && (
                                <PlayerAssignment
                                    open={true}
                                    onClose={() => { }}
                                    mandatory={true}
                                />
                            )}
                        </>
                    )}
                    </VotingProvider>
                </GameProvider>
            </PlayersProvider>
        </PitchAnimationProvider>
    );
};

const Layout = () => {
    return (
        <div className="h-full flex flex-col">
            <BrowserRouter>
                <LayoutContent />
            </BrowserRouter>
        </div>
    );
};

export default Layout;
