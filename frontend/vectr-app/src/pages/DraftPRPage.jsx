import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import { useToast } from '../components/Toast';
import NovaChat from '../components/NovaChat';
import { contributionAPI, novaAPI, progressAPI } from '../services/api';

export default function DraftPRPage() {
    const { org, repo, issueNumber } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const issue = location.state?.issue || {};
    const repoName = location.state?.repoName || `${org}/${repo}`;
    const allIssues = location.state?.issues || [];

    const [testResults, setTestResults] = useState(location.state?.testResults || '');
    const [codeChanges, setCodeChanges] = useState('');
    const [codeDiff, setCodeDiff] = useState('');
    const [prTitle, setPrTitle] = useState(`Fix #${issueNumber}: ${issue.title || ''}`);
    const [prBody, setPrBody] = useState(
        `## Description\n\nFixes #${issueNumber}\n\n## Changes Made\n\n- \n\n## Testing\n\n- [ ] Unit tests pass\n- [ ] Manual testing done\n\n## Related Issues\n\nCloses #${issueNumber}`
    );
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [isLoadingDiff, setIsLoadingDiff] = useState(false);
    const [isRefreshingTestingSteps, setIsRefreshingTestingSteps] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [savedPrTitle, setSavedPrTitle] = useState(prTitle);
    const [savedPrBody, setSavedPrBody] = useState(prBody);
    const [isSavingPR, setIsSavingPR] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [hasExistingPR, setHasExistingPR] = useState(null);
    const [isGeneratingPR, setIsGeneratingPR] = useState(false);
    const [prGenFailed, setPrGenFailed] = useState(false);
    const [diffLoaded, setDiffLoaded] = useState(false);
    const [commits, setCommits] = useState([]);

    // Load saved PR and other data from DB on mount
    useEffect(() => {
        if (!user?.email || !repoName || !issueNumber) return;
        let isMounted = true;

        const loadProgress = async () => {
            try {
                const saved = await progressAPI.get(user.email, repoName, issueNumber);
                if (isMounted) {
                    if (saved && (saved.pr_title || saved.pr_body)) {
                        setHasExistingPR(true);
                        if (saved.pr_title) {
                            setPrTitle(saved.pr_title);
                            setSavedPrTitle(saved.pr_title);
                        }
                        if (saved.pr_body) {
                            setPrBody(saved.pr_body);
                            setSavedPrBody(saved.pr_body);
                        }
                    } else {
                        setHasExistingPR(false);
                    }
                    if (saved?.test_results) {
                        setTestResults(saved.test_results);
                    }
                    try {
                        const parsedHistory = JSON.parse(saved.chat_history || '[]');
                        if (parsedHistory.length > 0) setChatMessages(parsedHistory);
                    } catch(e) {}
                }
            } catch (err) {
                console.error("Failed to load progress:", err);
                if (isMounted) setHasExistingPR(false);
            }
        };
        loadProgress();

        // Fetch diff
        const fetchDiff = async () => {
            setIsLoadingDiff(true);
            try {
                const res = await contributionAPI.getDiff(user.email, repoName, issueNumber);
                if (isMounted && res.diff_stat) {
                    setCodeChanges(res.diff_stat);
                }
                if (isMounted && res.diff_patch) {
                    setCodeDiff(res.diff_patch);
                }
            } catch (err) {
                console.error("Failed to fetch diff:", err);
            } finally {
                if (isMounted) {
                    setIsLoadingDiff(false);
                    setDiffLoaded(true);
                }
            }
        };
        fetchDiff();

        // Fetch commits to pass to Nova
        const fetchCommits = async () => {
             try {
                 const data = await novaAPI.fetchCommits(repoName, issueNumber, user?.email);
                 if (isMounted && data.commits) {
                     setCommits(data.commits);
                 }
             } catch(err) {
                 console.error("Failed to fetch commits for PR generation:", err);
             }
        };
        fetchCommits();

        // Auto-fetch testing steps
        if (!testResults || testResults === 'Nova is busy, check after a moment.' || testResults === 'No testing steps provided.') {
            const autoFetch = async () => {
                setIsRefreshingTestingSteps(true);
                setTestResults("fetching testing steps, please wait");
                try {
                    const data = await novaAPI.fetchTestingSteps(repoName, parseInt(issueNumber), issue.title || '', issue.body || '', [], user?.email);
                    if (isMounted) setTestResults(data.testing_steps || 'No testing steps provided.');
                } catch (err) {
                    console.error("Auto-fetch testing steps failed:", err);
                    if (isMounted) setTestResults('');
                } finally {
                    if (isMounted) setIsRefreshingTestingSteps(false);
                }
            };
            autoFetch();
        }

        return () => { isMounted = false; };
    }, [user?.email, repoName, issueNumber]);

    // Auto-generate PR when code diff is loaded and no existing PR
    useEffect(() => {
        if (hasExistingPR === false && diffLoaded && !isGeneratingPR) {
            let mounted = true;
            const autoGeneratePR = async () => {
                setIsGeneratingPR(true);
                try {
                    const prompt = "Please review the code changes and commit history, and generate a perfect pull request title and body for me. Keep it concise, descriptive, and accurately capture what was changed in these commits.";
                    const issuesContext = [{ number: Number(issueNumber), title: issue.title || '', state: 'open', labels: [] }];
                    
                    const formattedCommits = commits.length > 0 
                        ? commits.map(c => `- ${c.message} (by ${c.author})`).join('\n') 
                        : "No commits detected.";

                    const currentPrContext = { 
                        pr_title: `Fix #${issueNumber}: ${issue.title || ''}`, 
                        pr_body: '', 
                        code_diff: codeDiff,
                        commits: formattedCommits 
                    };
                    
                    const res = await novaAPI.ask(repoName, issuesContext, [{role: 'user', content: prompt}], issueNumber, user?.email, currentPrContext);
                    
                    if (mounted && res.updated_pr) {
                        const newTitle = res.updated_pr.pr_title || prTitle;
                        const newBody = res.updated_pr.pr_body || prBody;
                        setPrTitle(newTitle);
                        setSavedPrTitle(newTitle);
                        setPrBody(newBody);
                        setSavedPrBody(newBody);
                        
                        // Auto-save the generated PR
                        progressAPI.save({
                            user_email: user.email,
                            repo_name: repoName,
                            issue_number: parseInt(issueNumber),
                            issue_title: issue.title || `Issue #${issueNumber}`,
                            pr_title: newTitle,
                            pr_body: newBody,
                        });
                        
                        setHasExistingPR(true);
                        showToast('Nova finished drafting your PR!', 'success');
                    }
                } catch(err) {
                    console.error("Auto PR gen failed", err);
                    if (mounted) {
                        showToast('Failed to auto-generate PR', 'error');
                        setPrGenFailed(true);
                    }
                } finally {
                    if (mounted) setIsGeneratingPR(false);
                }
            };
            autoGeneratePR();
            return () => { mounted = false; };
        }
    }, [hasExistingPR, diffLoaded, codeDiff, repoName, issueNumber, issue.title, user?.email]);

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

    const handleEditPR = () => {
        setSavedPrTitle(prTitle);
        setSavedPrBody(prBody);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setPrTitle(savedPrTitle);
        setPrBody(savedPrBody);
        setIsEditing(false);
    };

    const handleSavePR = async () => {
        setIsSavingPR(true);
        try {
            await progressAPI.save({
                user_email: user.email,
                repo_name: repoName,
                issue_number: parseInt(issueNumber),
                issue_title: issue.title || `Issue #${issueNumber}`,
                pr_title: prTitle,
                pr_body: prBody,
            });
            setSavedPrTitle(prTitle);
            setSavedPrBody(prBody);
            setIsEditing(false);
            showToast('PR draft saved successfully', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to save PR draft', 'error');
        } finally {
            setIsSavingPR(false);
        }
    };

    const handlePRUpdate = (updatedPR) => {
        if (updatedPR.pr_title) {
            setPrTitle(updatedPR.pr_title);
            setSavedPrTitle(updatedPR.pr_title);
        }
        if (updatedPR.pr_body) {
            setPrBody(updatedPR.pr_body);
            setSavedPrBody(updatedPR.pr_body);
        }
        showToast('Nova updated your PR draft!', 'success');
    };

    const condensedIssues = allIssues.map(i => ({
        number: i.number, title: i.title, state: i.state, labels: i.labels || []
    }));

    const handleSendPR = async () => {
        if (!prTitle.trim()) {
            showToast('PR title is required', 'warning');
            return;
        }
        setSending(true);
        try {
            await contributionAPI.submitPR(user.email, repoName, issueNumber, prTitle, prBody);
            setSent(true);
            showToast('Pull Request submitted successfully!', 'success');
            setTimeout(() => navigate(ROUTES.DASHBOARD), 2000);
        } catch (err) {
            showToast(err.message || 'Failed to submit PR', 'error');
        } finally {
            setSending(false);
        }
    };

    const isLocked = sending || sent;

    return (
        <>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border-default/30">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Go back" disabled={isLocked}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold text-text-primary">Draft Pull Request</h1>
                        <p className="text-text-muted text-xs">{repoName} · #{issueNumber}</p>
                    </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSendPR}
                        disabled={isLocked}
                        className="btn-primary text-sm"
                        style={!sent ? { animation: 'pulse-glow 2s infinite' } : {}}
                        id="send-pr-btn"
                    >
                        {sent ? '✓ PR Sent!' : sending ? <><span className="spinner"></span> Sending...</> : 'Send PR'}
                    </button>
                </div>
            </header>

            {/* Success Banner */}
            {sent && (
                <div className="mx-6 mt-4 p-4 rounded-lg fade-in" style={{
                    background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)'
                }}>
                    <p className="text-accent-green font-semibold">🎉 Pull Request submitted successfully!</p>
                    <p className="text-text-muted text-sm mt-1">Redirecting to dashboard...</p>
                </div>
            )}

            {/* Content Grid */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Left Column */}
                <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
                    <div className="glass-card p-4 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold m-0" style={{ color: '#f87171' }}>Testing Steps</h3>
                            <button 
                                onClick={handleRefreshTestingSteps}
                                disabled={isRefreshingTestingSteps || isLocked}
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
                        <div className="block-scroll flex-1 min-h-0">
                            {testResults ? (
                                <div className="text-sm leading-relaxed text-text-muted markdown-body pr-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{testResults}</ReactMarkdown>
                                </div>
                            ) : isRefreshingTestingSteps ? (
                                <div className="flex flex-col items-center justify-center py-6 text-text-muted opacity-60">
                                    <span className="spinner mb-2 border-accent-red"></span>
                                    <p className="text-xs">Generating testing steps...</p>
                                </div>
                            ) : (
                                <p className="text-text-muted text-xs text-center py-6">Click refresh to generate testing steps.</p>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-4 flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
                        <h3 className="text-sm font-semibold" style={{ color: '#a855f7' }}>Code Changes</h3>
                        <div className="mt-3 block-scroll flex-1 min-h-0">
                            {isLoadingDiff ? (
                                <div className="w-full bg-bg-input text-text-muted text-xs rounded-lg p-3 border border-border-default/50 font-mono text-center opacity-60">
                                    Loading files changed...
                                </div>
                            ) : codeChanges && codeChanges.includes('|') ? (
                                <div className="w-full bg-bg-input rounded-lg border border-border-default/50 overflow-hidden text-xs">
                                    <div className="overflow-y-auto w-[100%] overflow-x-hidden">
                                        {codeChanges.split('\n').filter(line => line.includes('|')).map((line, idx) => {
                                            const parts = line.split('|');
                                            const filename = parts[0].trim();
                                            const stats = parts[1].trim();
                                            const additionsMatch = stats.match(/\d+(?=\s*\+)/) || stats.match(/\+/g);
                                            const deletionsMatch = stats.match(/\d+(?=\s*\-)/) || stats.match(/\-/g);
                                            const additionsCount = additionsMatch ? (Array.isArray(additionsMatch) && additionsMatch[0] === '+' ? additionsMatch.length : parseInt(additionsMatch[0])) : 0;
                                            const deletionsCount = deletionsMatch ? (Array.isArray(deletionsMatch) && deletionsMatch[0] === '-' ? deletionsMatch.length : parseInt(deletionsMatch[0])) : 0;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-2 pb-0 last:pb-2 gap-2" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                                    <span className="text-text-secondary truncate font-mono flex-1 min-w-[50%]" title={filename}>{filename}.</span>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0 text-text-muted font-mono">
                                                        {additionsCount > 0 && <span className="text-accent-green">{additionsCount}+</span>}
                                                        {deletionsCount > 0 && <span className="text-accent-red">{deletionsCount}-</span>}
                                                        {(additionsCount === 0 && deletionsCount === 0) && <span>{stats}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="p-2 border-t border-border-default/50 bg-bg-input-hover text-text-muted text-[10px] text-center font-mono">
                                        {codeChanges.split('\n').pop().trim()}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full bg-bg-input text-text-secondary text-xs rounded-lg p-3 border border-border-default/50 font-mono text-center">
                                    {codeChanges || "No code changes detected yet."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Column — PR Editor */}
                <div className="lg:col-span-5 flex flex-col overflow-hidden">
                    <div className="glass-card p-4 flex flex-col flex-1 min-h-0">
                        {/* PR Card Header with Edit/Save/Cancel */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-text-primary">Pull Request</h3>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={isSavingPR || isLocked}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-border-default/50 text-text-muted hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSavePR}
                                            disabled={isSavingPR || isLocked}
                                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                                            style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
                                        >
                                            {isSavingPR ? <span className="spinner small"></span> : (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                    <polyline points="7 3 7 8 15 8"></polyline>
                                                </svg>
                                            )}
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleEditPR}
                                        disabled={isLocked}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-border-default/50 text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* PR Content */}
                        {(isGeneratingPR || hasExistingPR === null || (hasExistingPR === false && !prGenFailed)) ? (
                            <div className="flex flex-col flex-1 items-center justify-center p-12 text-center text-text-muted mt-4">
                                <span className="dot-wave text-accent-cyan mb-4 scale-150">
                                    <span></span><span></span><span></span>
                                </span>
                                <p className="text-sm">Nova is analyzing your code changes to draft the perfect PR...</p>
                            </div>
                        ) : (
                        <div className="space-y-4 flex-1 min-h-0 block-scroll">
                            <div>
                                <label htmlFor="pr-title" className="text-text-muted text-xs mb-1 block">Title</label>
                                {isEditing ? (
                                    <input
                                        id="pr-title" type="text" value={prTitle} onChange={e => setPrTitle(e.target.value)}
                                        className="input-dark !rounded-lg text-sm disabled:opacity-60" placeholder="PR Title"
                                        disabled={isLocked}
                                    />
                                ) : (
                                    <div className="w-full bg-bg-input text-text-primary text-sm rounded-lg p-3 border border-border-default/50 font-medium">
                                        {prTitle || <span className="text-text-muted italic">No title set</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col min-h-0">
                                <label htmlFor="pr-body" className="text-text-muted text-xs mb-1 block">Body (Markdown)</label>
                                {isEditing ? (
                                    <textarea
                                        id="pr-body" value={prBody} onChange={e => setPrBody(e.target.value)}
                                        className="w-full bg-bg-input text-text-secondary text-sm rounded-lg p-4 border border-border-default/50 outline-none resize-none font-mono disabled:opacity-60 flex-1"
                                        rows={20} style={{ minHeight: '400px' }}
                                        disabled={isLocked}
                                    />
                                ) : (
                                    <div className="w-full bg-bg-input text-text-secondary text-sm rounded-lg p-4 border border-border-default/50 flex-1 min-h-[200px] markdown-body">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{prBody}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                    </div>
                </div>

                {/* Right Column — Ask Nova */}
                <div className="lg:col-span-4 min-h-0 h-full">
                    <NovaChat 
                        repoName={repoName} 
                        issuesContext={condensedIssues} 
                        activeIssueNumber={issueNumber}
                        externalMessages={chatMessages}
                        setExternalMessages={setChatMessages}
                        userEmail={user?.email}
                        onPRUpdate={handlePRUpdate}
                        prContext={{ 
                            pr_title: prTitle, 
                            pr_body: prBody, 
                            code_diff: codeDiff,
                            commits: commits.length > 0 ? commits.map(c => `- ${c.message} (by ${c.author})`).join('\n') : ""
                        }}
                    />
                </div>
            </div>
        </>
    );
}
