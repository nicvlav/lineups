import { useState, useEffect } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect'; // Use this to detect touch devices

import { PlayersProvider } from "@/data/players-provider";

import PlayersSidebar from "@/components/players-sidebar";
import HeaderBar from "@/components/header-bar";
import Game from "@/components/game";
import { Routes, Route } from 'react-router-dom';
import PlayerTable from "@/components/dialogs/player-table";
import TeamGenerator from "@/components/dialogs/team-generator";

// import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"

const Layout = () => {
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

    const isSmallScreen = width < 768; // You can customize this to match your breakpoint


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
            <PlayersProvider>
                <DndProvider backend={backend} options={options}>
                    <SidebarProvider>
                        <PlayersSidebar compact={isSmallScreen} />
                        <SidebarInset className="flex-1 min-h-0 flex flex-col h-full border">
                            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-2 sticky top-0 z-10 bg-background">
                                <SidebarTrigger className="-ml-1" />
                                {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}
                                <HeaderBar compact={isSmallScreen} />
                            </header>

                            {/* Add routes here, above headerbar has the tabbed nav icons */}
                            <Routes>
                                <Route index element={<Game width={width} height={height} />} />
                                <Route path="players" element={<PlayerTable width={width} />} />
                                <Route path="settings" element={<TeamGenerator width={width} />} />
                            </Routes>


                        </SidebarInset>
                    </SidebarProvider>
                </DndProvider>
            </PlayersProvider>
        </div>
    )
}

export default Layout;
