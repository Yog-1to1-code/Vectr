import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, APP } from '../constants';
import VectrLogo from './VectrLogo';

/**
 * Premium sidebar navigation inspired by Aceternity-style layouts.
 * Features collapsible sections, smooth transitions, and a clean dark aesthetic.
 */
export default function Sidebar({ collapsed, setCollapsed }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openSections, setOpenSections] = useState({
        contribute: true,
        settings: true,
    });

    const initials = user?.githubUsername?.charAt(0)?.toUpperCase()
        || user?.email?.charAt(0)?.toUpperCase()
        || 'V';

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleLogout = () => {
        logout();
        navigate(ROUTES.LOGIN);
    };

    const navLinkClass = (isActive) =>
        `sidebar-nav-item ${isActive ? 'sidebar-nav-active' : ''}`;

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
            {/* ─── Header: Logo + Collapse Toggle ─────────────── */}
            <div className="sidebar-header">
                <div className="sidebar-logo-group" onClick={() => navigate(ROUTES.DASHBOARD)}>
                    <VectrLogo size={32} />
                    {!collapsed && <span className="sidebar-brand">{APP.NAME}</span>}
                </div>
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {collapsed ? (
                            <polyline points="9 18 15 12 9 6" />
                        ) : (
                            <polyline points="15 18 9 12 15 6" />
                        )}
                    </svg>
                </button>
            </div>

            {/* ─── Primary Navigation ─────────────────────────── */}
            <nav className="sidebar-nav">
                <NavLink
                    to={ROUTES.DASHBOARD}
                    className={({ isActive }) => navLinkClass(isActive)}
                    title="Dashboard"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    {!collapsed && <span>Dashboard</span>}
                </NavLink>

                <NavLink
                    to={ROUTES.CONTRIBUTE}
                    className={({ isActive }) => navLinkClass(isActive)}
                    title="Explore Issues"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {!collapsed && <span>Explore Issues</span>}
                </NavLink>
            </nav>

            {/* ─── Divider ────────────────────────────────────── */}
            <div className="sidebar-divider" />

            {/* ─── Contribute Section ─────────────────────────── */}
            {!collapsed && (
                <div className="sidebar-section">
                    <button className="sidebar-section-header" onClick={() => toggleSection('contribute')}>
                        <div className="sidebar-section-title-group">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                                <path d="M9 18c-4.51 2-5-2-7-2" />
                            </svg>
                            <span>Contribute</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: openSections.contribute ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {openSections.contribute && (
                        <div className="sidebar-section-items">
                            <NavLink
                                to={ROUTES.CONTRIBUTE}
                                className={({ isActive }) => `sidebar-sub-item ${isActive ? 'sidebar-sub-active' : ''}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <span>Find Issues</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.DASHBOARD}
                                end
                                className={({ isActive }) => `sidebar-sub-item ${location.pathname === ROUTES.DASHBOARD ? 'sidebar-sub-active' : ''}`}
                                onClick={(e) => { e.preventDefault(); navigate(ROUTES.DASHBOARD); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span>My Contributions</span>
                            </NavLink>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                className="sidebar-sub-item"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                <span>GitHub</span>
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Settings Section ───────────────────────────── */}
            {!collapsed && (
                <div className="sidebar-section">
                    <button className="sidebar-section-header" onClick={() => toggleSection('settings')}>
                        <div className="sidebar-section-title-group">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            <span>Settings</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: openSections.settings ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {openSections.settings && (
                        <div className="sidebar-section-items">
                            <NavLink
                                to={ROUTES.SETTINGS}
                                className={({ isActive }) => `sidebar-sub-item ${isActive ? 'sidebar-sub-active' : ''}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                                <span>General</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.SETTINGS}
                                className={() => `sidebar-sub-item`}
                                onClick={(e) => { e.preventDefault(); navigate(ROUTES.SETTINGS); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                <span>Security</span>
                            </NavLink>
                            <NavLink
                                to={ROUTES.SETTINGS}
                                className={() => `sidebar-sub-item`}
                                onClick={(e) => { e.preventDefault(); navigate(ROUTES.SETTINGS); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                                <span>API Keys</span>
                            </NavLink>
                        </div>
                    )}
                </div>
            )}

            {/* Collapsed icons for sections */}
            {collapsed && (
                <div className="sidebar-nav" style={{ marginTop: 0 }}>
                    <NavLink
                        to={ROUTES.SETTINGS}
                        className={({ isActive }) => navLinkClass(isActive)}
                        title="Settings"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </NavLink>
                </div>
            )}

            {/* ─── Spacer ─────────────────────────────────────── */}
            <div className="sidebar-spacer" />

            {/* ─── User Profile + Logout ──────────────────────── */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar" title={user?.githubUsername || user?.email || 'Profile'}>
                        {initials}
                    </div>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">
                                {user?.githubUsername || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <span className="sidebar-user-email">
                                {user?.email || ''}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    className="sidebar-logout-btn"
                    onClick={handleLogout}
                    title="Logout"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </aside>
    );
}
