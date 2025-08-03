import { useState, useEffect } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect'; // Use this to detect touch devices
import { useAuth } from "@/context/auth-context";
import { PlayersProvider } from "@/context/players-provider";
import HeaderBar from "@/components/header-bar";
import { SquadVerification } from "@/components/dialogs/squad-verification";
import { useLocation } from 'react-router-dom';

import Game from "@/components/game";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayerCards from "@/components/dialogs/player-cards";
import PlayerTable from "@/components/dialogs/player-table";
import TeamGenerator from "@/components/dialogs/team-generator";
import VotingPage from "@/components/voting-page";
import SignInPage from "@/components/auth/sign-in";
import SignUpPage from "@/components/auth/sign-up";
import ResetPasswordPage from "@/components/auth/reset-password";
import UpdatePasswordPage from "@/components/auth/update-password";
import AuthDebugPage from "@/components/auth/debug";
import AuthCallbackPage from "@/components/auth/callback";
import DataDeletionPage from "@/components/data-deletion";

const LayoutContent = () => {
    const { canEdit, needsVerification, user } = useAuth();
    const location = useLocation();

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

    const { width, height } = useWindowSize();

    const isCompact = width < 768;
    const backend = isMobile ? TouchBackend : HTML5Backend;
    const options = isMobile
        ? {
            enableMouseEvents: false, // Prevents conflicts
            enableTouchEvents: true,
            // delayTouchStart: 10, // Adds a small delay before drag starts
            ignoreContextMenu: true, // Prevents issues with right-click
            usePointerEvents: true,
            preview: true,
        }
        : {}; // No extra options for desktop

    return (
        <PlayersProvider>
            <DndProvider backend={backend} options={options}>
                {/* Conditionally show header - not on auth routes */}
                {!isAuthRoute && (
                    <div className="sticky top-0 z-50">
                        <HeaderBar compact={isCompact} canEdit={canEdit} />
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
                        <Route index element={<Game isCompact={isCompact} playerSize={(isCompact ? Math.min(height * 2, width) : Math.min(height, width / 2)) / 16} />} />
                        {canEdit && <Route path="players" element={<PlayerTable isCompact={isCompact} />} />}
                        {!canEdit && <Route path="players" element={<Navigate to="/" />} />}
                        <Route path="cards" element={<PlayerCards />} />
                        <Route path="generate" element={<TeamGenerator isCompact={isCompact} />} />
                        <Route path="vote" element={<VotingPage />} />
                        
                        {/* Catch all - redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>

                {/* Squad verification dialog for users who need it */}
                {user && needsVerification && !isAuthRoute && (
                    <SquadVerification
                        open={true}
                        onClose={() => {}}
                        mandatory={true}
                    />
                )}
            </DndProvider>
        </PlayersProvider>
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
