import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * App layout wrapper. Wraps pages that need the sidebar.
 * Pages like Login and PAT use their own full-screen layout.
 */
export default function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            <main className="app-main" style={{ marginLeft: sidebarCollapsed ? 64 : 260 }}>
                <Outlet />
            </main>
        </div>
    );
}
