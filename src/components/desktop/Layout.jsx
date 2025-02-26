import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import HeaderBar from "./HeaderBar.jsx";
import CurrentGame from "./CurrentGame"; // Render directly

const Layout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen w-screen">
            {/* Fixed Header */}
            <HeaderBar toggleSidebar={() => setSidebarOpen(prev => !prev)} />

            {/* Main Layout: Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Takes up 20% of width, but with a min-width of 50px */}
                <div
                    className={`bg-gray-900 shadow-lg transition-all duration-300`}
                    style={{
                        flex: isSidebarOpen ? "0 0 20%" : "0 0 50px",
                        minWidth: isSidebarOpen ? "200px" : "0px",
                        maxWidth: isSidebarOpen ? "20%" : "0px" ,
                    }}
                >
                    {isSidebarOpen && <Sidebar />}
                </div>

                {/* Main Content - Adjusts dynamically based on sidebar width */}
                <div className="flex-1 transition-all duration-300 overflow-hidden">
                    <CurrentGame />
                </div>
            </div>
        </div>
    );
};

export default Layout;
