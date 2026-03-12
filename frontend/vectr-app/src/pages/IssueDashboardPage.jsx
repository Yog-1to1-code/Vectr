import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { novaAPI } from '../services/api';
import { buildDraftPRPath, ROUTES } from '../constants';
import { useToast } from '../components/Toast';
import VectrLogo from '../components/VectrLogo';
import NovaChat from '../components/NovaChat';

export default function IssueDashboardPage() {
    const { org, repo, issueNumber } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const issue = location.state?.issue || {};
    const repoName = location.state?.repoName || `${org}/${repo}`;
    const allIssues = location.state?.issues || [];

    const [issueSummary, setIssueSummary] = useState('');
    const [finalApproach, setFinalApproach] = useState('');
    const [commits, setCommits] = useState([]);
    const [testResults, setTestResults] = useState('');
    const [gitCommands, setGitCommands] = useState('');
    const [summarizing, setSummarizing] = useState(true);
    const [summaryError, setSummaryError] = useState('');

    // Auto-summarize via Amazon Nova on mount
    useEffect(() => {
        let cancelled = false;
        const fetchSummary = async () => {
            setSummarizing(true);
            setSummaryError('');
            try {
                const data = await novaAPI.summarize(
                    repoName,
                    parseInt(issueNumber),
                    issue.title || `Issue #${issueNumber}`,
                    issue.body || '',
                    []
                );
                if (!cancelled) {
                    setIssueSummary(data.summary || '');
                    setFinalApproach(data.approach || '');
                    setGitCommands(data.commands || '');
                }
            } catch (err) {
                if (!cancelled) {
                    // Fallback to static content if Nova fails
                    setSummaryError(err.message || 'Nova could not summarize this issue');
                    setIssueSummary(issue.body || `Issue #${issueNumber}: ${issue.title || 'No title'}\n\nUse the "Ask Nova!" panel to get an AI-generated summary.`);
                    setGitCommands(
                        `# Fork and clone\ngit clone https://github.com/${repoName}.git\ncd ${repo}\n\n# Create a feature branch\ngit checkout -b fix/issue-${issueNumber}\n\n# After making changes\ngit add .\ngit commit -m "Fix #${issueNumber}: ${issue.title || ''}"\ngit push origin fix/issue-${issueNumber}`
                    );
                }
            } finally {
                if (!cancelled) setSummarizing(false);
            }
        };
        fetchSummary();
        return () => { cancelled = true; };
    }, [repoName, issueNumber, issue.title, issue.body, repo]);

    const retrySummarize = () => {
        setSummarizing(true);
        setSummaryError('');
        novaAPI.summarize(repoName, parseInt(issueNumber), issue.title || '', issue.body || '', [])
            .then(data => {
                setIssueSummary(data.summary || '');
                setFinalApproach(data.approach || '');
                setGitCommands(data.commands || '');
            })
            .catch(err => setSummaryError(err.message || 'Retry failed'))
            .finally(() => setSummarizing(false));
    };

    const condensedIssues = allIssues.map(i => ({
        number: i.number, title: i.title, state: i.state, labels: i.labels || []
    }));

    return (
        <>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border-default/30">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Go back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold text-text-primary truncate">{issue.title || `Issue #${issueNumber}`}</h1>
                        <p className="text-text-muted text-xs">{repoName} · #{issueNumber}</p>
                    </div>
                </div>
                <VectrLogo size={32} />
                <div className="flex items-center gap-4">
                    <button className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Notifications">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>
                    <button
                        onClick={() => navigate(buildDraftPRPath(org, repo, issueNumber), {
                            state: { issue, repoName, issues: allIssues, issueSummary, finalApproach, testResults }
                        })}
                        className="btn-primary text-sm"
                        style={{ animation: 'pulse-glow 2s infinite' }}
                        id="draft-pr-btn"
                    >
                        Draft PR
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Left Column */}
                <div className="lg:col-span-3 space-y-6 overflow-y-auto">
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-text-primary">Commits</h3>
                            <span className="text-text-muted text-xs">{commits.length}</span>
                        </div>
                        <div className="space-y-2">
                            {commits.length === 0 ? (
                                <p className="text-text-muted text-xs text-center py-6">No commits yet. Start working on this issue!</p>
                            ) : (
                                commits.map((c, i) => <div key={i} className="p-2 text-xs text-text-secondary bg-bg-panel rounded">{c}</div>)
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Git Helper Commands</h3>
                        {summarizing ? (
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-4 w-full"></div>
                                <div className="skeleton-shimmer h-4 w-3/4"></div>
                                <div className="skeleton-shimmer h-4 w-5/6"></div>
                                <div className="skeleton-shimmer h-4 w-2/3"></div>
                            </div>
                        ) : (
                            <pre className="text-xs text-text-muted whitespace-pre-wrap bg-bg-input rounded-lg p-3 overflow-x-auto select-all">{gitCommands}</pre>
                        )}
                    </div>

                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold" style={{ color: '#f87171' }}>Test Results</h3>
                        <div className="mt-2">
                            {testResults ? (
                                <pre className="text-xs text-text-muted whitespace-pre-wrap bg-bg-input rounded-lg p-3">{testResults}</pre>
                            ) : (
                                <p className="text-text-muted text-xs text-center py-6">No test results yet</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Column */}
                <div className="lg:col-span-5 space-y-6 overflow-y-auto">
                    <div className="glass-card-accent p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-text-primary">Issue Summary</h3>
                            <div className="flex items-center gap-2">
                                {summarizing && <span className="spinner" style={{ color: '#22d3ee' }}></span>}
                                {issue.labels?.length > 0 && (
                                    <div className="flex gap-1">
                                        {issue.labels.slice(0, 3).map((l, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-bg-panel text-text-secondary border border-border-default/50">{l}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {summarizing ? (
                            <div className="space-y-3 py-2">
                                <div className="skeleton-shimmer h-4 w-full"></div>
                                <div className="skeleton-shimmer h-4 w-11/12"></div>
                                <div className="skeleton-shimmer h-4 w-4/5"></div>
                                <div className="skeleton-shimmer h-4 w-3/4"></div>
                                <div className="skeleton-shimmer h-4 w-2/3"></div>
                            </div>
                        ) : (
                            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{issueSummary}</div>
                        )}
                        {summaryError && !summarizing && (
                            <div className="mt-3 flex items-center justify-between p-2 rounded-lg text-xs" style={{
                                background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', color: '#facc15'
                            }}>
                                <span>⚠ Nova: {summaryError}</span>
                                <button onClick={retrySummarize} className="underline hover:no-underline ml-2">Retry</button>
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Final Approach</h3>
                        <div className="text-sm text-text-secondary leading-relaxed">
                            {summarizing ? (
                                <div className="space-y-3 py-2">
                                    <div className="skeleton-shimmer h-4 w-full"></div>
                                    <div className="skeleton-shimmer h-4 w-5/6"></div>
                                    <div className="skeleton-shimmer h-4 w-4/5"></div>
                                    <div className="skeleton-shimmer h-4 w-3/4"></div>
                                </div>
                            ) : finalApproach ? (
                                <div className="whitespace-pre-wrap">{finalApproach}</div>
                            ) : (
                                <div className="text-center py-10 text-text-muted">
                                    <div className="text-3xl mb-3">💡</div>
                                    <p className="mb-1">Ask Nova for a suggested approach</p>
                                    <p className="text-xs">The AI will analyze the issue and suggest implementation steps</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column — Ask Nova */}
                <div className="lg:col-span-4">
                    <NovaChat repoName={repoName} issuesContext={condensedIssues} />
                </div>
            </div>
        </>
    );
}
