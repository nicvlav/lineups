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
    const { players } = usePlayers();

    const getTeamPlayers = (team: string) => {
        if (!players || !Array.isArray(players)) {
            console.warn("Invalid players format:", players);
            return [];
        }
        return players.filter(player => player.team === team);
    };

    const useWindowSize = () => {
        const [windowSize, setWindowSize] = useState({
            width: window.innerWidth,
        });

        useEffect(() => {
            const handleResize = () => {
                setWindowSize({ width: window.innerWidth });
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

    const isSmallScreen = width < 768; // You can customize this to match your breakpoint

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
                    <div className="flex flex-col pl-2 pr-2 gap-2 h-[180vh] w-full max-w-[100%] mx-auto">
                        {/* First Div */}
                        <TeamArea team="A" teamPlayers={getTeamPlayers("A")} playerSize={55} />

                        {/* Second Div */}
                        <TeamArea team="B" teamPlayers={getTeamPlayers("B")} playerSize={55} />
                    </div>
                )}

                {/* Layout for large screens (side by side) */}
                {!isSmallScreen && (
                    <div className="flex flex-1 pl-2 pr-2 gap-2">
                        {/* First Div */}
                        <TeamArea team="A" teamPlayers={getTeamPlayers("A")} playerSize={55} />

                        {/* Second Div */}
                        <TeamArea team="B" teamPlayers={getTeamPlayers("B")} playerSize={55} />
                    </div>
                )}


            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout;
