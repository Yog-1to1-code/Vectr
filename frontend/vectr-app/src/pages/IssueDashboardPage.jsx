import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { novaAPI, progressAPI } from '../services/api';
import { buildDraftPRPath, ROUTES } from '../constants';
import { useToast } from '../components/Toast';
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
    const [forkDetected, setForkDetected] = useState(false);
    const [forkVscodeUrl, setForkVscodeUrl] = useState(null);
    const [testResults, setTestResults] = useState('');
    const [summarizing, setSummarizing] = useState(true);
    const [summaryError, setSummaryError] = useState('');
    const [refreshingCommits, setRefreshingCommits] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshingTestingSteps, setIsRefreshingTestingSteps] = useState(false);

    // Git commands are always generated locally — no Nova credits needed
    const gitCommands = (
        `## Git Commands in vscode.dev\n\n` +
        `> After opening your fork in vscode.dev, open the terminal with \`Ctrl+J\`.\n\n` +
        `### 1. Create a Feature Branch\n\`\`\`\ngit checkout -b fix/issue-${issueNumber}\n\`\`\`\n\n` +
        `### 2. Make Your Changes\nEdit the relevant files, then:\n\n` +
        `### 3. Stage & Commit\n\`\`\`\ngit add .\ngit commit -m "Fix #${issueNumber}: <brief description>"\n\`\`\`\n\n` +
        `### 4. Push to Your Fork\n\`\`\`\ngit push origin fix/issue-${issueNumber}\n\`\`\`\n\n` +
        `### 5. Evaluate with Nova\nHit **Refresh** on the Commits panel, then use **Ask Nova!** to get AI-powered feedback on your changes.`
    );

    // Helper: fetch testing steps from Nova (used in multiple places)
    const autoFetchTestingSteps = async () => {
        setIsRefreshingTestingSteps(true);
        setTestResults("fetching testing steps, please wait");
        try {
            const data = await novaAPI.fetchTestingSteps(repoName, parseInt(issueNumber), issue.title || '', issue.body || '', [], user?.email);
            setTestResults(data.testing_steps || 'No testing steps provided.');
        } catch (err) {
            console.error("Auto-fetch testing steps failed:", err);
            setTestResults('');
        } finally {
            setIsRefreshingTestingSteps(false);
        }
    };

    // Auto-summarize via Amazon Nova on mount
    useEffect(() => {
        let cancelled = false;
        const fetchSummary = async () => {
            setSummarizing(true);
            setSummaryError('');
            
            try {
                // Try to load saved progress first
                const saved = await progressAPI.get(user.email, repoName, issueNumber);
                if (!cancelled && saved && (saved.issue_summary || saved.chat_history !== '[]')) {
                    setIssueSummary(saved.issue_summary || '');
                    setFinalApproach(saved.final_approach || '');
                    const savedSteps = saved.test_results || '';
                    setTestResults(savedSteps);
                    // Restore fork status from saved progress
                    if (saved.fork_status === 'available') {
                        setForkDetected(true);
                        setForkVscodeUrl(saved.fork_vscode_url || null);
                    }
                    try {
                        const parsedHistory = JSON.parse(saved.chat_history || '[]');
                        setChatMessages(prev => [...prev, ...parsedHistory]);
                    } catch(e) {}
                    setSummarizing(false);
                    return; // Skip generation since we loaded progress
                }
            } catch (err) {
                console.error("Failed to load progress:", err);
            }
            
            const isNovaEnabled = import.meta.env.VITE_USE_NOVA !== 'false';
            if (!isNovaEnabled) {
                if (!cancelled) {
                    setIssueSummary(issue.body || "No issue description provided.");
                    setFinalApproach("Amazon Nova AI features are currently disabled. Set VITE_USE_NOVA=true to enable AI-powered approach suggestions.");
                    setTestResults("");
                    setSummarizing(false);
                }
                return;
            }

            try {
                const data = await novaAPI.summarize(
                    repoName,
                    parseInt(issueNumber),
                    issue.title || `Issue #${issueNumber}`,
                    issue.body || '',
                    [],
                    user?.email
                );
                if (!cancelled) {
                    setIssueSummary(data.summary || '');
                    setFinalApproach(data.approach || '');
                    setTestResults(data.testing_steps || '');
                }
            } catch (err) {
                if (!cancelled) {
                    setSummaryError(err.message || 'Nova could not summarize this issue');
                    setIssueSummary(issue.body || `Issue #${issueNumber}: ${issue.title || 'No title'}\n\nUse the "Ask Nova!" panel to get an AI-generated summary.`);
                    setTestResults("");
                }
            } finally {
                if (!cancelled) setSummarizing(false);
            }
        };
        fetchSummary();
        return () => { cancelled = true; };
    }, [repoName, issueNumber, issue.title, issue.body, repo, user?.email]);

    // Auto-fetch commits on mount
    useEffect(() => {
        if (!user?.email || !repoName || !issueNumber) return;
        let isMounted = true;
        const fetchCommitsOnMount = async () => {
            setRefreshingCommits(true);
            try {
                const data = await novaAPI.fetchCommits(repoName, issueNumber, user?.email);
                if (isMounted) {
                    setCommits(data.commits || []);
                    setForkDetected(data.fork_detected ?? false);
                    setForkVscodeUrl(data.fork_vscode_url ?? null);
                }
            } catch (err) {
                console.error("Auto-fetch commits failed:", err);
            } finally {
                if (isMounted) setRefreshingCommits(false);
            }
        };
        fetchCommitsOnMount();
        return () => { isMounted = false; };
    }, [user?.email, repoName, issueNumber]);

    // Auto-fetch testing steps on mount (always refresh for latest)
    useEffect(() => {
        if (!user?.email || !repoName || !issueNumber) return;
        let isMounted = true;
        const fetchStepsOnMount = async () => {
            setIsRefreshingTestingSteps(true);
            try {
                const data = await novaAPI.fetchTestingSteps(repoName, parseInt(issueNumber), issue.title || '', issue.body || '', [], user?.email);
                if (isMounted) setTestResults(data.testing_steps || '');
            } catch (err) {
                console.error("Auto-fetch testing steps failed:", err);
            } finally {
                if (isMounted) setIsRefreshingTestingSteps(false);
            }
        };
        fetchStepsOnMount();
        return () => { isMounted = false; };
    }, [user?.email, repoName, issueNumber]);

    // Auto-save logic (debounced)
    useEffect(() => {
        if (!user?.email || !repoName || !issueNumber) return;
        
        const timeout = setTimeout(() => {
            progressAPI.save({
                user_email: user.email,
                repo_name: repoName,
                issue_number: parseInt(issueNumber),
                issue_title: issue.title || `Issue #${issueNumber}`,
                issue_summary: issueSummary,
                final_approach: finalApproach,
                git_commands: gitCommands,
                test_results: testResults,
                chat_history: JSON.stringify(chatMessages)
            }).catch(e => console.error("Auto-save failed", e));
        }, 5000);
        
        return () => clearTimeout(timeout);
    }, [issueSummary, finalApproach, gitCommands, testResults, chatMessages, summarizing, user?.email, repoName, issueNumber]);
    
    const saveProgress = async () => {
        if (!user?.email) return;
        setIsSaving(true);
        try {
            await progressAPI.save({
                user_email: user.email,
                repo_name: repoName,
                issue_number: parseInt(issueNumber),
                issue_title: issue.title || `Issue #${issueNumber}`,
                issue_summary: issueSummary,
                final_approach: finalApproach,
                git_commands: gitCommands,
                test_results: testResults,
                chat_history: JSON.stringify(chatMessages)
            });
            showToast('Progress saved successfully', 'success');
        } catch (err) {
            showToast('Failed to save progress', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const retrySummarize = () => {
        setSummarizing(true);
        setSummaryError('');
        novaAPI.summarize(repoName, parseInt(issueNumber), issue.title || '', issue.body || '', [], user?.email)
            .then(data => {
                setIssueSummary(data.summary || '');
                setFinalApproach(data.approach || '');
                setTestResults(data.testing_steps || 'No testing steps provided.');
                // git commands handled locally
            })
            .catch(err => setSummaryError(err.message || 'Retry failed'))
            .finally(() => setSummarizing(false));
    };

    const handleRefreshCommits = async () => {
        setRefreshingCommits(true);
        try {
            const data = await novaAPI.fetchCommits(repoName, issueNumber, user?.email);
            setCommits(data.commits || []);
            setForkDetected(data.fork_detected ?? false);
            setForkVscodeUrl(data.fork_vscode_url ?? null);
            if (data.fork_detected) {
                showToast('Fork detected! Pulled latest commits.', 'success');
            } else {
                showToast('Fork not found yet — please fork the repo first.', 'info');
            }
        } catch (err) {
            showToast(err.message || 'Failed to fetch commits from your fork', 'error');
        } finally {
            setRefreshingCommits(false);
        }
    };

    const handleRefreshTestingSteps = async () => {
        setIsRefreshingTestingSteps(true);
        const originalText = testResults;
        setTestResults("fetching testing steps, please wait");
        
        try {
            const data = await novaAPI.fetchTestingSteps(repoName, parseInt(issueNumber), issue.title || '', issue.body || '', [], user?.email);
            setTestResults(data.testing_steps || 'No testing steps provided.');
        } catch (err) {
            showToast(err.message || 'Failed to fetch testing steps', 'error');
            setTestResults(originalText);
        } finally {
            setIsRefreshingTestingSteps(false);
        }
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
                <div className="flex-1" />
                <div className="flex items-center gap-4">
                    <button 
                        onClick={saveProgress}
                        disabled={isSaving || summarizing}
                        className="btn-secondary text-sm flex items-center gap-2"
                        title="Save Progress"
                    >
                        {isSaving ? <span className="spinner small"></span> : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                        )}
                        <span>Save</span>
                    </button>
                    <button
                        onClick={() => navigate(buildDraftPRPath(org, repo, issueNumber), {
                            state: { issue, repoName, issues: allIssues, issueSummary, finalApproach, testResults }
                        })}
                        className={`btn-primary text-sm ${commits.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={commits.length > 0 ? { animation: 'pulse-glow 2s infinite' } : {}}
                        id="draft-pr-btn"
                        disabled={commits.length === 0}
                        title={commits.length === 0 ? "You need at least one commit to draft a PR" : "Draft a Pull Request"}
                    >
                        Draft PR
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-[2.5fr_5.7fr_3.8fr] gap-4" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Left Column — each card is sticky and scrolls independently */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    <div className="glass-card p-3 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-text-primary m-0 leading-none">Commits</h3>
                                <button 
                                    onClick={handleRefreshCommits}
                                    disabled={refreshingCommits}
                                    className="text-text-muted hover:text-accent-cyan transition-colors disabled:opacity-50"
                                    aria-label="Refresh commits"
                                    title="Refresh commits"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                         className={refreshingCommits ? "animate-reverse-spin" : ""}>
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                    </svg>
                                </button>
                            </div>
                            <span className="text-text-muted text-xs">{commits.length}</span>
                        </div>
                        {/* Pinned vscode.dev link when fork is available — always at top */}
                        {forkDetected && forkVscodeUrl && (
                            <a
                                href={forkVscodeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all mb-2"
                                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                                Open fork in vscode.dev ✓
                            </a>
                        )}

                        {/* Scrollable commits content */}
                        <div className="block-scroll flex-1 min-h-0 space-y-2">
                            {commits.length === 0 ? (
                                <div className="py-4 space-y-3">
                                    {/* Fork link — always shown */}
                                    <a
                                        href={`https://github.com/${repoName}/fork`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                                            <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
                                            <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/>
                                        </svg>
                                        Fork this repo on GitHub
                                    </a>

                                    {/* Disabled vscode.dev placeholder only if fork NOT yet detected */}
                                    {!forkDetected && (
                                        <div
                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed select-none"
                                            style={{ background: 'rgba(6,182,212,0.05)', border: '1px dashed rgba(6,182,212,0.2)', color: '#22d3ee' }}
                                            title="Fork the repo first to unlock this"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                            </svg>
                                            Open fork in vscode.dev
                                        </div>
                                    )}

                                    <p className="text-text-muted text-xs text-center pt-1 opacity-60">
                                        Refresh after forking to detect your fork →
                                    </p>
                                </div>
                            ) : (
                                commits.map((c, i) => <div key={i} className="p-2 text-xs text-text-secondary bg-bg-panel rounded">{c}</div>)
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-3 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Git Helper Commands</h3>
                        {summarizing ? (
                            <div className="space-y-2">
                                <div className="skeleton-shimmer h-4 w-full"></div>
                                <div className="skeleton-shimmer h-4 w-3/4"></div>
                                <div className="skeleton-shimmer h-4 w-5/6"></div>
                                <div className="skeleton-shimmer h-4 w-2/3"></div>
                            </div>
                        ) : (
                            <div className="block-scroll flex-1 min-h-0 prose prose-invert prose-sm max-w-none text-xs text-text-muted">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        a: ({ href, children }) => (
                                            <a href={href} target="_blank" rel="noopener noreferrer"
                                               className="text-accent-cyan hover:text-accent-green underline transition-colors">
                                                {children}
                                            </a>
                                        ),
                                        code: ({ inline, children }) => inline ? (
                                            <code className="bg-bg-input px-1 rounded text-accent-green font-mono">{children}</code>
                                        ) : (
                                            <pre className="bg-bg-input rounded-lg p-3 overflow-x-auto select-all whitespace-pre-wrap my-2 text-text-muted">
                                                <code className="font-mono">{children}</code>
                                            </pre>
                                        ),
                                        h3: ({ children }) => <h3 className="text-text-primary font-semibold mt-3 mb-1 text-xs">{children}</h3>,
                                        h2: ({ children }) => <h2 className="text-text-primary font-bold mt-2 mb-2 text-sm">{children}</h2>,
                                        blockquote: ({ children }) => (
                                            <blockquote className="border-l-2 border-accent-cyan pl-2 text-text-muted italic">{children}</blockquote>
                                        ),
                                    }}
                                >{gitCommands}</ReactMarkdown>
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-3 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold m-0" style={{ color: '#f87171' }}>Testing Steps</h3>
                            <button 
                                onClick={handleRefreshTestingSteps}
                                disabled={isRefreshingTestingSteps}
                                className="text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                                aria-label="Refresh testing steps"
                                title="Refresh testing steps"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRefreshingTestingSteps ? "animate-reverse-spin" : ""}>
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-2 block-scroll flex-1 min-h-0">
                            {testResults ? (
                                <div className="text-sm leading-relaxed text-text-muted markdown-body pr-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{testResults}</ReactMarkdown>
                                </div>
                            ) : (summarizing || isRefreshingTestingSteps) ? (
                                <div className="flex flex-col items-center justify-center py-6 text-text-muted opacity-60">
                                    <span className="spinner mb-2 border-accent-red"></span>
                                    <p className="text-xs">Generating testing steps...</p>
                                </div>
                            ) : (
                                <p className="text-text-muted text-xs text-center py-6">Click refresh to generate testing steps.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Column — each card sticky with own scrollbar */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    <div className="glass-card-accent p-4 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
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
                            <div className="block-scroll flex-1 min-h-0 text-sm leading-relaxed max-w-none text-text-secondary markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{issueSummary}</ReactMarkdown>
                            </div>
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

                    <div className="glass-card p-4 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
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
                                <div className="block-scroll flex-1 min-h-0 max-w-none markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalApproach}</ReactMarkdown>
                                </div>
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
                <div className="min-h-0 h-full">
                    <NovaChat 
                        repoName={repoName} 
                        issuesContext={condensedIssues} 
                        activeIssueNumber={issueNumber}
                        externalMessages={chatMessages}
                        setExternalMessages={setChatMessages}
                        userEmail={user?.email}
                        onApproachUpdate={(newApproach) => setFinalApproach(newApproach)}
                    />
                </div>
            </div>
        </>
    );
}
