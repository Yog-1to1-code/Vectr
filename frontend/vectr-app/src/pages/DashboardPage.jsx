import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, repoAPI } from '../services/api';
import { ROUTES, buildIssuePath, STATUS, STATUS_COLORS } from '../constants';
import StatusBadge from '../components/StatusBadge';
import CommitMap from '../components/CommitMap';
import { CardSkeleton } from '../components/Skeleton';
import { HoverBorderGradient } from '../components/ui/hover-border-gradient';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [navigatingTo, setNavigatingTo] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadDashboard = async (showRefresh = false) => {
        if (!user?.email) return;
        if (showRefresh) setIsRefreshing(true);
        
        try {
            const data = await dashboardAPI.get(user.email);
            setDashboard(data);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            if (showRefresh) setIsRefreshing(false);
            else setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
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
            navigate(buildIssuePath(org, repo, issueNum), { state: { repoName }});
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
        <div className="dashboard-page fade-in">
            {/* ─── Top Bar ─────────────────────────────────────── */}
            <div className="dashboard-topbar">
                <div>
                    <h1 className="dashboard-greeting">Welcome back, {displayName}</h1>
                    <p className="dashboard-subtitle">Here's what's happening with your contributions</p>
                </div>
                <div className="dashboard-topbar-actions">
                    <StatusBadge status={experienceLevel} />
                    <HoverBorderGradient
                        containerClassName="rounded-full"
                        as="button"
                        onClick={() => navigate(ROUTES.CONTRIBUTE)}
                        id="start-contributing-btn"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Start Contributing</span>
                    </HoverBorderGradient>
                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    <span>{error}</span>
                    <button onClick={() => { setError(''); setLoading(true); dashboardAPI.get(user.email).then(setDashboard).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
                        className="dashboard-error-retry">Retry</button>
                </div>
            )}

            {/* ─── Stats Row ───────────────────────────────────── */}
            <div className="dashboard-stats-row">
                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </div>
                    <div>
                        <span className="dashboard-stat-value">{contributions.length}</span>
                        <span className="dashboard-stat-label">Contributions</span>
                    </div>
                </div>
                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div>
                        <span className="dashboard-stat-value">{workingIssues.length}</span>
                        <span className="dashboard-stat-label">In Progress</span>
                    </div>
                </div>
                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                            <path d="M9 18c-4.51 2-5-2-7-2" />
                        </svg>
                    </div>
                    <div>
                        <span className="dashboard-stat-value">{pullRequests.length}</span>
                        <span className="dashboard-stat-label">Pull Requests</span>
                    </div>
                </div>
                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(250,204,21,0.1)', color: '#facc15' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </div>
                    <div>
                        <span className="dashboard-stat-value">{contributions.filter(c => c.status === STATUS.ACCEPTED).length}</span>
                        <span className="dashboard-stat-label">Accepted</span>
                    </div>
                </div>
            </div>

            {/* ─── Main Grid ───────────────────────────────────── */}
            <div className="dashboard-grid">
                {/* Left Column — My Contributions */}
                <div className="dashboard-col-main">
                    {loading ? <CardSkeleton rows={3} /> : (
                        <div className="dashboard-card">
                            <div className="dashboard-card-header">
                                <h2 className="dashboard-card-title">
                                    My Contributions
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); loadDashboard(true); }}
                                        disabled={isRefreshing}
                                        className="dashboard-refresh-btn"
                                        title="Refresh status"
                                    >
                                        <svg className={isRefreshing ? "animate-reverse-spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                            <path d="M3 3v5h5"/>
                                        </svg>
                                    </button>
                                </h2>
                                <span className="dashboard-card-count">
                                    {isRefreshing ? (
                                        <span className="dot-wave text-text-muted">
                                            <span></span><span></span><span></span>
                                        </span>
                                    ) : (
                                        `${contributions.length} total`
                                    )}
                                </span>
                            </div>
                            <div className="dashboard-card-body">
                                {contributions.length === 0 ? (
                                    <div className="dashboard-empty">
                                        <div className="dashboard-empty-icon">🚀</div>
                                        <p className="dashboard-empty-title">No contributions yet</p>
                                        <p className="dashboard-empty-desc">Start your open source journey today</p>
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
                                                className={`dashboard-issue-card ${issueNum ? 'clickable' : ''}`}
                                            >
                                                {navigatingTo === `contributions-${c.repo_name}#${issueNum}` && (
                                                    <div className="dashboard-issue-loading">
                                                        <span className="spinner"></span>
                                                    </div>
                                                )}
                                                <div className="dashboard-issue-top">
                                                    <p className="dashboard-issue-repo">{c.repo_name}</p>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                                <p className="dashboard-issue-title">{c.issue_title}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="dashboard-col-side">
                    {/* Working Issues */}
                    {loading ? <CardSkeleton rows={2} /> : (
                        <div className="dashboard-card">
                            <div className="dashboard-card-header">
                                <h2 className="dashboard-card-title">Working Issues</h2>
                                <span className="dashboard-card-count">{workingIssues.length}</span>
                            </div>
                            <div className="dashboard-card-body">
                                {workingIssues.length === 0 ? (
                                    <p className="dashboard-empty-small">No active issues</p>
                                ) : (
                                    workingIssues.map((w, i) => {
                                        // Extract issue number safely from title (e.g. "Issue #123: ...")
                                        const match = w.issue_title.match(/#(\d+)/);
                                        const issueNum = match ? match[1] : '';
                                        
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => handleIssueClick(w.repo_name, issueNum, 'working')}
                                                className={`dashboard-issue-card ${issueNum ? 'clickable' : ''}`}
                                            >
                                                {navigatingTo === `working-${w.repo_name}#${issueNum}` && (
                                                    <div className="dashboard-issue-loading">
                                                        <span className="spinner"></span>
                                                    </div>
                                                )}
                                                <p className="dashboard-issue-repo">{w.repo_name}</p>
                                                <p className="dashboard-issue-title">{w.issue_title}</p>
                                                {w.language && (
                                                    <span className="dashboard-issue-lang">{w.language}</span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Commit Map */}
                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2 className="dashboard-card-title">Commit Map</h2>
                        </div>
                        <div style={{ padding: '0 16px 16px' }}>
                            <CommitMap data={commitData} />
                        </div>
                    </div>

                    {/* Pull Requests */}
                    {loading ? <CardSkeleton rows={2} /> : (
                        <div className="dashboard-card">
                            <div className="dashboard-card-header">
                                <h2 className="dashboard-card-title">Pull Requests</h2>
                                <span className="dashboard-card-count">{pullRequests.length}</span>
                            </div>
                            <div className="dashboard-card-body">
                                {pullRequests.length === 0 ? (
                                    <p className="dashboard-empty-small">No pull requests yet</p>
                                ) : (
                                    pullRequests.map((pr, i) => {
                                        const match = pr.issue_title.match(/#(\d+)/);
                                        const issueNum = match ? match[1] : '';
                                        
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => handleIssueClick(pr.repo_name, issueNum, 'pr')}
                                                className={`dashboard-issue-card pr-card ${issueNum ? 'clickable' : ''}`}
                                            >
                                                {navigatingTo === `pr-${pr.repo_name}#${issueNum}` && (
                                                    <div className="dashboard-issue-loading">
                                                        <span className="spinner"></span>
                                                    </div>
                                                )}
                                                <div className="dashboard-pr-row">
                                                    <div>
                                                        <p className="dashboard-issue-repo">{pr.repo_name} • {pr.date_of_submission}</p>
                                                        <p className="dashboard-issue-title" title={pr.issue_title}>{pr.issue_title}</p>
                                                    </div>
                                                    <span className="dashboard-pr-status"
                                                        style={{
                                                            background: STATUS_COLORS[pr.status]?.bg || STATUS_COLORS[STATUS.UNKNOWN].bg,
                                                            color: STATUS_COLORS[pr.status]?.text || STATUS_COLORS[STATUS.UNKNOWN].text,
                                                            borderColor: STATUS_COLORS[pr.status]?.border || STATUS_COLORS[STATUS.UNKNOWN].border
                                                        }}>
                                                        {pr.status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
