import { useState, useEffect } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/auth-context";
import { PlayersProvider } from "@/context/players-provider";
import HeaderBar from "@/components/header-bar";
import { SquadVerification } from "@/components/dialogs/squad-verification";
import { useLocation } from 'react-router-dom';

import Game from "@/components/game";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayerCards from "@/components/dialogs/player-cards";
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
    const { needsVerification, user } = useAuth();
    const location = useLocation();
    const isMobile = useIsMobile();
    
    // Detect if we're on staging
    const isStaging = window.location.hostname.includes('staging');
    
    const showCards = user?.id === 'c0be95af-865c-4c45-b4ad-4e34c7c7e2c2'; 

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

    // Separate concerns: width-based responsive design vs touch device detection
    const isCompact = width < 768; // Responsive layout based on viewport width
    const backend = isMobile ? TouchBackend : HTML5Backend; // Touch events based on device capability
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
                {/* Staging environment banner */}
                {isStaging && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-1 px-4 text-sm font-medium z-50 relative">
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
                            // More aggressive scaling for player sizes
                            if (isCompact) {
                                // Mobile/compact: scale more with width constraints
                                return Math.min(height * 2, width * 0.12, 80) / 16;
                            } else {
                                // Desktop: more aggressive scaling between min width (768) and larger screens
                                const minDesktopWidth = 768;
                                const scaleFactor = Math.min(width / minDesktopWidth, 2.5); // Cap at 2.5x scaling
                                return Math.min(height, width / 2) * scaleFactor / 16;
                            }
                        })()} />} />
                        {showCards && <Route path="cards" element={<PlayerCards />} />}
                        {!showCards && <Route path="cards" element={<Navigate to="/" />} />}
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
