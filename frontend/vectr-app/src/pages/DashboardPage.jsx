import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { ROUTES } from '../constants';
import VectrLogo from '../components/VectrLogo';
import StatusBadge from '../components/StatusBadge';
import CommitMap from '../components/CommitMap';
import { CardSkeleton } from '../components/Skeleton';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.email) return;
        let cancelled = false;

        const fetchDashboard = async () => {
            try {
                const data = await dashboardAPI.get(user.email);
                if (!cancelled) setDashboard(data);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load dashboard');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchDashboard();
        return () => { cancelled = true; };
    }, [user?.email]);

    const displayName = dashboard?.user_name
        || user?.githubUsername
        || user?.email?.split('@')[0]
        || 'Contributor';
    const experienceLevel = dashboard?.experience_level || user?.experienceLevel || 'Intermediate';
    const contributions = dashboard?.my_contributions || [];
    const workingIssues = dashboard?.working_issues || [];
    const commitData = dashboard?.commit_map || [];
    const pullRequests = dashboard?.pull_requests || [];

    return (
        <>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border-default/30">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-text-primary">{displayName}</h1>
                    <StatusBadge status={experienceLevel} />
                </div>
                <VectrLogo size={32} />
                <div className="flex items-center gap-4">
                    <button className="text-text-secondary hover:text-text-primary transition-colors relative" aria-label="Notifications">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>
                    <button onClick={() => navigate(ROUTES.CONTRIBUTE)} className="btn-primary text-sm" id="start-contributing-btn">
                        Start Contributing
                    </button>
                </div>
            </header>

            {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg text-sm flex items-center justify-between" style={{
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171'
                }}>
                    <span>{error}</span>
                    <button onClick={() => { setError(''); setLoading(true); dashboardAPI.get(user.email).then(setDashboard).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
                        className="text-xs underline hover:no-underline ml-4">Retry</button>
                </div>
            )}

            {/* Dashboard Grid */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column — My Contributions */}
                <div className="lg:col-span-2">
                    {loading ? <CardSkeleton rows={3} /> : (
                        <div className="glass-card p-5 h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-text-primary">My Contributions</h2>
                                <span className="text-text-muted text-xs">{contributions.length} total</span>
                            </div>
                            <div className="space-y-3">
                                {contributions.length === 0 ? (
                                    <div className="text-center py-16 text-text-muted">
                                        <div className="text-4xl mb-3">🚀</div>
                                        <p className="text-lg mb-2">No contributions yet</p>
                                        <p className="text-sm mb-4">Start your open source journey today</p>
                                        <button onClick={() => navigate(ROUTES.CONTRIBUTE)} className="btn-primary text-sm">
                                            Find an Issue
                                        </button>
                                    </div>
                                ) : (
                                    contributions.map((c, i) => (
                                        <div key={i} className="p-4 rounded-lg border border-border-default/50 hover:border-accent-cyan/30 transition-all cursor-pointer group"
                                            style={{ background: 'rgba(19,29,47,0.5)' }}>
                                            <div className="flex items-center justify-between">
                                                <p className="text-text-muted text-xs">{c.repo_name}</p>
                                                <StatusBadge status={c.status} />
                                            </div>
                                            <p className="text-text-primary font-medium mt-1 group-hover:text-accent-cyan transition-colors">{c.issue_title}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Working Issues */}
                    {loading ? <CardSkeleton rows={2} /> : (
                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-text-primary">Working Issues</h2>
                                <span className="text-text-muted text-xs">{workingIssues.length}</span>
                            </div>
                            <div className="space-y-3">
                                {workingIssues.length === 0 ? (
                                    <p className="text-text-muted text-sm text-center py-6">No active issues</p>
                                ) : (
                                    workingIssues.map((w, i) => (
                                        <div key={i} className="p-3 rounded-lg border border-border-default/30" style={{ background: 'rgba(19,29,47,0.5)' }}>
                                            <p className="text-text-muted text-xs">{w.repo_name}</p>
                                            <p className="text-text-primary text-sm font-medium mt-0.5">{w.issue_title}</p>
                                            {w.language && (
                                                <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-xs font-semibold"
                                                    style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                                                    {w.language}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Commit Map */}
                    <div className="glass-card p-5">
                        <h2 className="text-lg font-semibold text-text-primary mb-4">Commit Map</h2>
                        <CommitMap data={commitData} />
                    </div>

                    {/* Pull Requests */}
                    {loading ? <CardSkeleton rows={2} /> : (
                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-text-primary">Pull Requests</h2>
                                <span className="text-text-muted text-xs">{pullRequests.length}</span>
                            </div>
                            <div className="space-y-3">
                                {pullRequests.length === 0 ? (
                                    <p className="text-text-muted text-sm text-center py-6">No pull requests yet</p>
                                ) : (
                                    pullRequests.map((pr, i) => (
                                        <div key={i} className="p-3 rounded-lg flex items-center justify-between border border-border-default/30" style={{ background: 'rgba(19,29,47,0.5)' }}>
                                            <div className="min-w-0">
                                                <p className="text-text-muted text-xs">{pr.repo_name}</p>
                                                <p className="text-text-primary text-sm font-medium truncate">{pr.issue_title}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-3">
                                                {pr.date_of_submission && <span className="text-text-muted text-xs">{pr.date_of_submission}</span>}
                                                <StatusBadge status={pr.status} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
