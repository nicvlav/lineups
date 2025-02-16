import React, { useState } from "react";
import MobileSidebar from "./MobileSidebar";
import MobileHeaderBar from "./MobileHeaderBar.jsx";
import MobileCurrentGame from "./MobileCurrentGame"; // Render directly

const MobileLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen w-screen">
            {/* Fixed Header */}
            <MobileHeaderBar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

            {/* Main Layout: Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Fixed width when open, hidden when closed */}
                <div
                    className={`bg-gray-900 shadow-lg transition-all duration-300
                        ${isSidebarOpen ? "w-full" : "w-0"}
                    `}
                >
                    {isSidebarOpen && <MobileSidebar />}
                </div>

                {/* Main Content - Forces its own scrolling */}
                <div className="flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 overflow-y-auto">
                        <MobileCurrentGame />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileLayout;
