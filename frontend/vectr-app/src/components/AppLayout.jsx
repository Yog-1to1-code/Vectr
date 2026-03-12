import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * App layout wrapper. Wraps pages that need the sidebar.
 * Pages like Login and PAT use their own full-screen layout.
 */
export default function AppLayout() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Sidebar />
            <main className="ml-14 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
