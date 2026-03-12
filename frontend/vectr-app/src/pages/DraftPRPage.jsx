import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import { useToast } from '../components/Toast';
import VectrLogo from '../components/VectrLogo';
import NovaChat from '../components/NovaChat';

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
    const [prTitle, setPrTitle] = useState(`Fix #${issueNumber}: ${issue.title || ''}`);
    const [prBody, setPrBody] = useState(
        `## Description\n\nFixes #${issueNumber}\n\n## Changes Made\n\n- \n\n## Testing\n\n- [ ] Unit tests pass\n- [ ] Manual testing done\n\n## Related Issues\n\nCloses #${issueNumber}`
    );
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

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
            // TODO: integrate with backend PR creation endpoint when ready
            await new Promise(resolve => setTimeout(resolve, 2000));
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
                <VectrLogo size={32} />
                <div className="flex items-center gap-4">
                    <button className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Notifications">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>
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
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Left Column */}
                <div className="lg:col-span-3 space-y-6 overflow-y-auto">
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold" style={{ color: '#f87171' }}>Test Results</h3>
                        <div className="mt-3">
                            <textarea
                                value={testResults}
                                onChange={e => setTestResults(e.target.value)}
                                placeholder="Paste test output here..."
                                className="w-full bg-bg-input text-text-secondary text-xs rounded-lg p-3 border border-border-default/50 outline-none resize-none font-mono disabled:opacity-60"
                                rows={6}
                                aria-label="Test results"
                                disabled={isLocked}
                            />
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold" style={{ color: '#a855f7' }}>Code Changes</h3>
                        <div className="mt-3">
                            <textarea
                                value={codeChanges}
                                onChange={e => setCodeChanges(e.target.value)}
                                placeholder="Describe changes or paste a diff..."
                                className="w-full bg-bg-input text-text-secondary text-xs rounded-lg p-3 border border-border-default/50 outline-none resize-none font-mono disabled:opacity-60"
                                rows={12}
                                aria-label="Code changes"
                                disabled={isLocked}
                            />
                        </div>
                    </div>
                </div>

                {/* Center Column — PR Editor */}
                <div className="lg:col-span-5 overflow-y-auto">
                    <div className="glass-card p-5 h-full">
                        <h3 className="text-sm font-semibold text-text-primary mb-4">Pull Request</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="pr-title" className="text-text-muted text-xs mb-1 block">Title</label>
                                <input
                                    id="pr-title" type="text" value={prTitle} onChange={e => setPrTitle(e.target.value)}
                                    className="input-dark !rounded-lg text-sm disabled:opacity-60" placeholder="PR Title"
                                    disabled={isLocked}
                                />
                            </div>
                            <div>
                                <label htmlFor="pr-body" className="text-text-muted text-xs mb-1 block">Body (Markdown)</label>
                                <textarea
                                    id="pr-body" value={prBody} onChange={e => setPrBody(e.target.value)}
                                    className="w-full bg-bg-input text-text-secondary text-sm rounded-lg p-4 border border-border-default/50 outline-none resize-none font-mono disabled:opacity-60"
                                    rows={20} style={{ minHeight: '400px' }}
                                    disabled={isLocked}
                                />
                            </div>
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
