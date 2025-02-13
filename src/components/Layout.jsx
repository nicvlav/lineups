import React, { useState } from "react";
import Sidebar from "./sidebar/Sidebar";
import HeaderBar from "./HeaderBar.jsx";
import CurrentGame from "./game/CurrentGame"; // Render directly

const Layout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen w-screen">
            {/* Fixed Header */}
            <HeaderBar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

            {/* Main Layout: Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Fixed width when open, hidden when closed */}
                <div
                    className={`bg-gray-900 shadow-lg transition-all duration-300
                        ${isSidebarOpen ? "w-72" : "w-0"}
                    `}
                >
                    {isSidebarOpen && <Sidebar />}
                </div>

                {/* Main Content - Shrinks dynamically based on sidebar width */}
                <div className="flex-1 transition-all duration-300 overflow-hidden"
                    style={{ width: isSidebarOpen ? "calc(100% - 18rem)" : "100%" }}>
                    <CurrentGame />
                </div>
            </div>
        </div>
    );
};

export default Layout;
