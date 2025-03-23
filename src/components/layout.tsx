import { useState, useEffect } from "react";
import { usePlayers } from "@/data/players-provider";
import PlayersSidebar from "@/components/players-sidebar";
import HeaderBar from "@/components/header-bar";
import TeamArea from "@/components/pitch/team-area"; // Render directly

// import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"

function Layout() {
    const { gamePlayers } = usePlayers();

    const getTeamPlayers = (team: string) => {
        if (!gamePlayers || !Array.isArray(gamePlayers)) {
            console.warn("Invalid players format:", gamePlayers);
            return [];
        }
        return gamePlayers.filter(player => player.team === team);
    };

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
    const playerSize = (isSmallScreen ? Math.min(height * 2, width) : Math.min(height, width / 2)) / 12;

    return (
        // wrap our sidebar and content inside a provider, the core content layout is inside the inset
        <SidebarProvider>
            <PlayersSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-2 sticky top-0 z-10 bg-background">
                    <SidebarTrigger className="-ml-1" />
                    {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}
                    <HeaderBar iconSize={isSmallScreen ? 13 : 16} showIconText={!isSmallScreen} />
                </header>

                {/* Layout for small screens (stacked and tall) */}
                {isSmallScreen && (
                    <div className="flex flex-col pl-2 pr-2 pb-5 gap-5 h-[180vh] w-full max-w-[100%] mx-auto">
                        {/* First Div */}
                        <TeamArea team="A" teamPlayers={getTeamPlayers("A")} playerSize={playerSize} />

                        {/* Second Div */}
                        <TeamArea team="B" teamPlayers={getTeamPlayers("B")} playerSize={playerSize} />
                    </div>
                )}

                {/* Layout for large screens (side by side) */}
                {!isSmallScreen && (
                    <div className="flex flex-1 pl-2 pr-2 gap-2">
                        {/* First Div */}
                        <TeamArea team="A" teamPlayers={getTeamPlayers("A")} playerSize={playerSize} />

                        {/* Second Div */}
                        <TeamArea team="B" teamPlayers={getTeamPlayers("B")} playerSize={playerSize} />
                    </div>
                )}


            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout;
