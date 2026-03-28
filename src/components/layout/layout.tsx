import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import PlayerManager from "@/components/admin/player-manager";
import { PlayerAssignment } from "@/components/auth/dialogs/player-assignment";
import { SquadIdVerification } from "@/components/auth/dialogs/squad-id-verification";
import AuthCallbackPage from "@/components/auth/pages/callback";
import DataDeletionPage from "@/components/auth/pages/data-deletion";
import AuthDebugPage from "@/components/auth/pages/debug";
import ResetPasswordPage from "@/components/auth/pages/reset-password";
import SignInPage from "@/components/auth/pages/sign-in";
import SignUpPage from "@/components/auth/pages/sign-up";
import UpdatePasswordPage from "@/components/auth/pages/update-password";
import Game from "@/components/game/game";
import TeamGenerator from "@/components/game/team-generator";
import { BottomNav } from "@/components/layout/bottom-nav";
import NotFound from "@/components/layout/not-found";
import ProtectedRoute from "@/components/layout/protected-route";
import { TopBar } from "@/components/layout/top-bar";
import PlayerCards from "@/components/players/player-cards";
import VotingPage from "@/components/voting/voting-page";
import { useAuth } from "@/context/auth-context";
import { GameProvider } from "@/context/game-provider";
import { PitchAnimationProvider } from "@/context/pitch-animation-context";
import { useWindowSize } from "@/hooks/use-window-size";
import { cn } from "@/lib/utils";

const LayoutContent = () => {
    const { needsVerification, user } = useAuth();
    const location = useLocation();

    // Detect if we're on staging
    const isStaging = window.location.hostname.includes("staging");

    // Check if current route is an auth route
    const isAuthRoute = location.pathname.startsWith("/auth");

    const { width } = useWindowSize();

    // Responsive layout based on viewport width
    const isCompact = width < 768;

    return (
        <PitchAnimationProvider>
            <GameProvider>
                {/* Staging environment banner */}
                {isStaging && (
                    <div className="bg-linear-to-r from-orange-500 to-red-500 text-white text-center py-1 px-4 text-sm font-medium z-50 relative">
                        🚧 STAGING ENVIRONMENT - For Testing Only 🚧
                    </div>
                )}

                {/* Top bar - minimal logo + auth/theme */}
                {!isAuthRoute && (
                    <div className="sticky top-0 z-50">
                        <TopBar />
                    </div>
                )}

                {/* Main content area */}
                <main className={cn("flex-1 overflow-auto", !isAuthRoute && "pb-16")}>
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
                        <Route
                            index
                            element={
                                <Game
                                    isCompact={isCompact}
                                    playerSize={(() => {
                                        return isCompact ? (width < 400 ? 40 : 60) : 70;
                                    })()}
                                />
                            }
                        />
                        <Route path="cards" element={<PlayerCards />} />
                        <Route path="generate" element={<TeamGenerator isCompact={isCompact} />} />

                        {/* Protected routes - only for verified users */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="manage" element={<PlayerManager />} />
                            <Route path="vote" element={<VotingPage />} />
                        </Route>

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </main>

                {/* Bottom navigation */}
                {!isAuthRoute && <BottomNav />}

                {/* Verification dialogs for users who need them */}
                {user && needsVerification && !isAuthRoute && (
                    <>
                        {/* Step 1: Squad ID verification (if no squad_id) */}
                        {!user.profile?.squad_id && (
                            <SquadIdVerification open={true} onClose={() => {}} mandatory={true} />
                        )}

                        {/* Step 2: Player assignment (if has squad_id but not fully verified) */}
                        {user.profile?.squad_id && !user.profile?.is_verified && (
                            <PlayerAssignment open={true} onClose={() => {}} mandatory={true} />
                        )}
                    </>
                )}
            </GameProvider>
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
