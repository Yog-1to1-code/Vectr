import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, repoAPI } from '../services/api';
import { ROUTES, buildIssuePath, STATUS, STATUS_COLORS } from '../constants';
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
    const [navigatingTo, setNavigatingTo] = useState(null);

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

    const handleIssueClick = async (repoName, issueNum, blockType) => {
        if (!issueNum) return;

        const navId = `${blockType}-${repoName}#${issueNum}`;
        setNavigatingTo(navId);

        try {
            const org = repoName.split('/')[0];
            const repo = repoName.split('/')[1] || '';

            // We need to fetch the issue details before navigating because IssueDashboardPage expects it in state
            const data = await repoAPI.getRepoIssues(org, repo, user.email);
            const targetIssue = data.issues?.find(i => i.number.toString() === issueNum.toString());

            navigate(buildIssuePath(org, repo, issueNum), {
                state: {
                    issue: targetIssue || { title: `Issue #${issueNum}` },
                    repoName,
                    issues: data.issues || []
                }
            });
        } catch (err) {
            console.error("Failed to fetch issue details for navigation:", err);
            // Fallback navigate
            const org = repoName.split('/')[0];
            const repo = repoName.split('/')[1] || '';
            navigate(buildIssuePath(org, repo, issueNum), { state: { repoName } });
        } finally {
            setNavigatingTo(null);
        }
    };

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
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column — My Contributions */}
                <div className="lg:col-span-2">
                    {loading ? <CardSkeleton rows={3} /> : (
                        <div className="glass-card p-4 h-full">
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
                                    contributions.map((c, i) => {
                                        const match = c.issue_title.match(/#(\d+)/);
                                        const issueNum = match ? match[1] : '';

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleIssueClick(c.repo_name, issueNum, 'contributions')}
                                                className={`p-4 rounded-lg border border-border-default/50 transition-all group relative overflow-hidden ${issueNum ? 'cursor-pointer hover:border-accent-cyan/30 hover:bg-white/5 active:scale-[0.98]' : ''}`}
                                                style={{ background: 'rgba(19,29,47,0.5)' }}
                                            >
                                                {navigatingTo === `contributions-${c.repo_name}#${issueNum}` && (
                                                    <div className="absolute inset-0 bg-background-main/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                                        <span className="w-5 h-5 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin"></span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <p className="text-text-muted text-xs">{c.repo_name}</p>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                                <p className="text-text-primary font-medium mt-1 group-hover:text-accent-cyan transition-colors">{c.issue_title}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Working Issues */}
                    {loading ? <CardSkeleton rows={2} /> : (
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-text-primary">Working Issues</h2>
                                <span className="text-text-muted text-xs">{workingIssues.length}</span>
                            </div>
                            <div className="space-y-3">
                                {workingIssues.length === 0 ? (
                                    <p className="text-text-muted text-sm text-center py-6">No active issues</p>
                                ) : (
                                    workingIssues.map((w, i) => {
                                        // Extract issue number safely from title (e.g. "Issue #123: ...")
                                        const match = w.issue_title.match(/#(\d+)/);
                                        const issueNum = match ? match[1] : '';

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleIssueClick(w.repo_name, issueNum, 'working')}
                                                className={`p-3 rounded-lg border border-border-default/30 relative overflow-hidden transition-all ${issueNum ? 'cursor-pointer hover:border-accent-cyan/50 hover:bg-white/5 active:scale-[0.98]' : ''}`}
                                                style={{ background: 'rgba(19,29,47,0.5)' }}
                                            >
                                                {navigatingTo === `working-${w.repo_name}#${issueNum}` && (
                                                    <div className="absolute inset-0 bg-background-main/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                                        <span className="w-5 h-5 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin"></span>
                                                    </div>
                                                )}
                                                <p className="text-text-muted text-xs">{w.repo_name}</p>
                                                <p className="text-text-primary text-sm font-medium mt-0.5">{w.issue_title}</p>
                                                {w.language && (
                                                    <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-xs font-semibold"
                                                        style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                                                        {w.language}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Commit Map */}
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-text-primary">Commit Map</h2>
                            <button
                                onClick={handleRefreshCommitMap}
                                disabled={refreshingCommitMap}
                                className="text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                                aria-label="Refresh Commit Map"
                                title="Refresh Commit Map"
                            >
                                <svg className={`w-5 h-5 ${refreshingCommitMap ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <CommitMap data={commitData} />
                    </div>

                    {/* Pull Requests */}
                    {loading ? <CardSkeleton rows={2} /> : (
                        <div className="glass-card p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-text-primary">Pull Requests</h2>
                                <span className="text-text-muted text-xs">{pullRequests.length}</span>
                            </div>
                            <div className="space-y-3">
                                {pullRequests.length === 0 ? (
                                    <p className="text-text-muted text-sm text-center py-6">No pull requests yet</p>
                                ) : (
                                    pullRequests.map((pr, i) => {
                                        const match = pr.issue_title.match(/#(\d+)/);
                                        const issueNum = match ? match[1] : '';

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleIssueClick(pr.repo_name, issueNum, 'pr')}
                                                className={`p-3 rounded-lg border border-border-default/30 flex items-center justify-between relative overflow-hidden transition-all ${issueNum ? 'cursor-pointer hover:border-accent-cyan/50 hover:bg-white/5 active:scale-[0.98]' : ''}`}
                                                style={{ background: 'rgba(19,29,47,0.5)' }}
                                            >
                                                {navigatingTo === `pr-${pr.repo_name}#${issueNum}` && (
                                                    <div className="absolute inset-0 bg-background-main/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                                        <span className="w-5 h-5 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin"></span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-text-muted text-xs">{pr.repo_name} • {pr.date_of_submission}</p>
                                                    <p className="text-text-primary text-sm font-medium mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]" title={pr.issue_title}>{pr.issue_title}</p>
                                                </div>
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                                                    style={{
                                                        background: STATUS_COLORS[pr.status]?.bg || STATUS_COLORS[STATUS.UNKNOWN].bg,
                                                        color: STATUS_COLORS[pr.status]?.text || STATUS_COLORS[STATUS.UNKNOWN].text,
                                                        borderColor: STATUS_COLORS[pr.status]?.border || STATUS_COLORS[STATUS.UNKNOWN].border
                                                    }}>
                                                    {pr.status}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
