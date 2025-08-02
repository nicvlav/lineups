import { useState, useEffect } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect'; // Use this to detect touch devices
import { useAuth } from "@/context/auth-context";
import { PlayersProvider } from "@/context/players-provider";
import HeaderBar from "@/components/header-bar";

import Game from "@/components/game";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayerCards from "@/components/dialogs/player-cards";
import PlayerTable from "@/components/dialogs/player-table";
import TeamGenerator from "@/components/dialogs/team-generator";
// import SignInPage from "@/components/signin/sign-in";

const Layout = () => {
    // const { canEdit, user } = useAuth();
    const { canEdit } = useAuth();

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
        <div className="h-full flex flex-col">
            <BrowserRouter>
                <PlayersProvider>
                    <DndProvider backend={backend} options={options}>
                        <div className="sticky top-0 z-50">
                            <HeaderBar compact={isCompact} canEdit={canEdit} />
                        </div>

                        {/* Main content area */}
                        <main className="flex-1 overflow-auto">
                            <Routes>
                                <Route index element={<Game isCompact={isCompact} playerSize={(isCompact ? Math.min(height * 2, width) : Math.min(height, width / 2)) / 16} />} />
                                {canEdit && <Route path="players" element={<PlayerTable isCompact={isCompact} />} />}
                                {!canEdit && <Route path="players" element={<Navigate to="/" />} />}
                                <Route path="cards" element={<PlayerCards />} />
                                <Route path="generate" element={<TeamGenerator isCompact={isCompact} />} />
                                {/* {!user && <Route path="signin" element={<SignInPage />} />}
                                {user && <Route path="signin" element={<Navigate to="/" />} />} */}
                            </Routes>
                        </main>
                    </DndProvider>
                </PlayersProvider>
            </BrowserRouter>
        </div>
    )
}

export default Layout;
