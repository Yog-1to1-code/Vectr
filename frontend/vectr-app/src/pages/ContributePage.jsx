import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { contributionAPI, repoAPI } from '../services/api';
import { ROUTES, FLOW_STEPS, SUPPORTED_LANGUAGES, buildIssuePath } from '../constants';
import { useToast } from '../components/Toast';
import NovaChat from '../components/NovaChat';
import { ListSkeleton } from '../components/Skeleton';
import { Button as StatefulButton } from '../components/ui/stateful-button';

export default function ContributePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [step, setStep] = useState(FLOW_STEPS.SELECT_LANGUAGE);
    const [languages, setLanguages] = useState([]);
    const [selectedLang, setSelectedLang] = useState(null);
    const [orgs, setOrgs] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [repos, setRepos] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showLangModal, setShowLangModal] = useState(false);
    const [showOrgModal, setShowOrgModal] = useState(false);
    
    // Search states
    const [langSearch, setLangSearch] = useState('');
    const [orgSearch, setOrgSearch] = useState('');

    useEffect(() => { initFlow(); }, []);

    const initFlow = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await contributionAPI.start(user.email);
            if (data.next_step === FLOW_STEPS.SELECT_LANGUAGE) {
                setLanguages(data.languages?.length ? data.languages : SUPPORTED_LANGUAGES);
                setShowLangModal(true);
                setStep(FLOW_STEPS.SELECT_LANGUAGE);
            } else {
                setOrgs(data.organizations || []);
                setShowOrgModal(true);
                setStep(FLOW_STEPS.SELECT_ORG);
            }
        } catch (err) {
            if (err.message && err.message.toLowerCase().includes('pat is missing')) {
                showToast('Please set your GitHub Personal Access Token to continue.', 'error');
                navigate(ROUTES.PAT);
                return;
            }
            // If backend not ready, show language selection with defaults
            setLanguages(SUPPORTED_LANGUAGES);
            setShowLangModal(true);
            setStep(FLOW_STEPS.SELECT_LANGUAGE);
        } finally {
            setLoading(false);
        }
    };

    const handleLangSelect = async (lang) => {
        setSelectedLang(lang);
        setShowLangModal(false);
        setLoading(true);
        setError('');
        try {
            const data = await contributionAPI.start(user.email, lang === 'All' ? null : lang);
            setOrgs(data.organizations || []);
            setShowOrgModal(true);
            setStep(FLOW_STEPS.SELECT_ORG);
        } catch (err) {
            if (err.message && err.message.toLowerCase().includes('pat is missing')) {
                showToast('Please set your GitHub Personal Access Token to continue.', 'error');
                navigate(ROUTES.PAT);
                return;
            }
            setError(err.message || 'Failed to fetch organizations');
        } finally {
            setLoading(false);
        }
    };

    const handleOrgSelect = async (org) => {
        setSelectedOrg(org);
        setShowOrgModal(false);
        setLoading(true);
        setError('');
        try {
            const data = await repoAPI.getOrgRepos(org.name, user.email, selectedLang === 'All' ? null : selectedLang);
            setRepos(data.repos || []);
            setStep(FLOW_STEPS.BROWSE);
            showToast(`Browsing ${org.name} repos`, 'info');
        } catch (err) {
            setError(err.message || 'Failed to fetch repositories');
            setStep(FLOW_STEPS.BROWSE);
        } finally {
            setLoading(false);
        }
    };

    const handleRepoClick = async (repo) => {
        setSelectedRepo(repo);
        setIssues([]);
        setLoading(true);
        try {
            const data = await repoAPI.getRepoIssues(selectedOrg.name, repo.name, user.email);
            setIssues(data.issues || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch issues');
        } finally {
            setLoading(false);
        }
    };

    const handleFallbackOrgSearch = async (orgName) => {
        setLoading(true);
        setError('');
        try {
            // Fetch directly from github without Auth header
            const res = await fetch(`https://api.github.com/users/${encodeURIComponent(orgName.trim())}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Organization or user not found on GitHub');
                throw new Error('Failed to fetch from GitHub');
            }
            const data = await res.json();
            
            // Note: A user or org is fine. We just map it to the expected structure.
            const newOrg = {
                name: data.login,
                description: data.description || '',
                avatar_url: data.avatar_url,
                url: data.html_url,
                language: selectedLang
            };
            
            // Add to the top of our list so they see it
            setOrgs([newOrg, ...orgs]);
            setSelectedOrg(newOrg);
            setOrgSearch(''); // clear search so it shows in the list
        } catch (err) {
            setError(err.message || 'Error fetching from GitHub');
        } finally {
            setLoading(false);
        }
    };

    const handleIssueSelect = (issue) => {
        navigate(buildIssuePath(selectedOrg.name, selectedRepo.name, issue.number), {
            state: { issue, repoName: `${selectedOrg.name}/${selectedRepo.name}`, issues }
        });
    };

    const condensedIssues = issues.map(i => ({
        number: i.number, title: i.title, state: i.state, labels: i.labels
    }));

    const currentOrgName = selectedOrg?.name || 'Select an Organization';

    return (
        <>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border-default/30">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(ROUTES.DASHBOARD)} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Back to dashboard">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-text-primary">{currentOrgName}</h1>
                    {selectedLang && selectedLang !== 'All' && (
                        <span className="status-badge" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                            {selectedLang}
                        </span>
                    )}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                    <button onClick={() => { setShowLangModal(true); setSelectedOrg(null); setRepos([]); setIssues([]); }}
                        className="btn-secondary text-xs">
                        Change Filter
                    </button>
                </div>
            </header>

            {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg text-sm" style={{
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171'
                }}>
                    {error}
                </div>
            )}

            {/* 3-Column Layout */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Repo List */}
                <div className="lg:col-span-3 glass-card p-4 block-scroll">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-text-primary">Repositories</h2>
                        <span className="text-text-muted text-xs">{repos.length}</span>
                    </div>
                    {loading && repos.length === 0 ? <ListSkeleton rows={4} /> : (
                        <div className="space-y-2">
                            {repos.length === 0 && (
                                <p className="text-text-muted text-sm text-center py-8">Select an organization to browse repositories</p>
                            )}
                            {repos.map((repo, i) => (
                                <button key={i} onClick={() => handleRepoClick(repo)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedRepo?.name === repo.name ? 'border-accent-cyan/50 bg-bg-panel' : 'border-border-default/30 hover:border-border-default'
                                        }`}
                                    style={{ background: selectedRepo?.name === repo.name ? 'rgba(26,39,68,0.8)' : 'rgba(19,29,47,0.4)' }}>
                                    <p className="text-text-primary text-sm font-medium truncate">{repo.name}</p>
                                    <p className="text-text-muted text-xs mt-1 truncate">{repo.description || 'No description'}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                        {repo.language && <span>{repo.language}</span>}
                                        <span>⭐ {repo.stars ?? 0}</span>
                                        <span>🔧 {repo.open_issues_count ?? 0}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Issue List */}
                <div className="lg:col-span-5 glass-card p-4 block-scroll">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-text-primary">Issues</h2>
                        <span className="text-text-muted text-xs">{issues.length}</span>
                    </div>
                    {loading && selectedRepo && issues.length === 0 ? <ListSkeleton rows={5} /> : (
                        <div className="space-y-3">
                            {issues.length === 0 && !loading && (
                                <p className="text-text-muted text-sm text-center py-8">
                                    {selectedRepo ? 'No open issues found in this repository' : 'Select a repository to browse issues'}
                                </p>
                            )}
                            {issues.map((issue, i) => (
                                <div key={i} className="p-4 rounded-lg border border-border-default/30 hover:border-accent-cyan/30 transition-all cursor-pointer group"
                                    style={{ background: 'rgba(19,29,47,0.4)' }}
                                    onClick={() => handleIssueSelect(issue)}>
                                    <p className="text-text-primary text-sm font-medium group-hover:text-accent-cyan transition-colors">
                                        #{issue.number}: {issue.title}
                                    </p>
                                    <p className="text-text-muted text-xs mt-1 line-clamp-2">{issue.body || 'No description'}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex gap-1 flex-wrap">
                                            {(issue.labels || []).slice(0, 3).map((l, j) => (
                                                <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-bg-panel text-text-secondary border border-border-default/50">{l}</span>
                                            ))}
                                        </div>
                                        <span className="text-xs text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ask Nova */}
                <div className="lg:col-span-4 min-h-0 h-full">
                    <NovaChat
                        repoName={selectedRepo ? `${selectedOrg?.name}/${selectedRepo.name}` : ''}
                        issuesContext={condensedIssues}
                    />
                </div>
            </div>

            {/* ── Language Selection Modal ── */}
            {showLangModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => { }}>
                    <div className="glass-card-accent w-full max-w-2xl p-8 m-4 slide-up flex flex-col max-h-[80vh]" role="dialog" aria-label="Select Language">
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f0f0f0', marginBottom: '6px' }}>Select Language</h3>
                        <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '24px' }}>Choose a language to filter relevant organizations and repositories</p>
                        <div style={{ marginBottom: '16px' }}>
                            <input 
                                type="text"
                                placeholder="Search languages..."
                                value={langSearch}
                                onChange={(e) => setLangSearch(e.target.value)}
                                className="modal-search-input"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6 overflow-y-auto">
                            {(languages.length > 0 ? languages : SUPPORTED_LANGUAGES)
                                .filter(lang => lang.toLowerCase().includes(langSearch.toLowerCase()))
                                .map((lang, i) => (
                                <button key={i} onClick={() => setSelectedLang(lang)}
                                    className={`modal-pill-btn ${selectedLang === lang ? 'modal-pill-selected' : ''}`}
                                >{lang}</button>
                            ))}
                            <button onClick={() => setSelectedLang('All')}
                                className={`modal-pill-btn ${selectedLang === 'All' ? 'modal-pill-selected' : ''}`}
                            >All Languages</button>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => { setShowLangModal(false); navigate(ROUTES.DASHBOARD); }} className="modal-btn-cancel">Cancel</button>
                            <StatefulButton onClick={() => selectedLang && handleLangSelect(selectedLang)} disabled={!selectedLang}>
                                Next
                            </StatefulButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Org Selection Modal ── */}
            {showOrgModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card-accent w-full max-w-2xl p-8 m-4 slide-up max-h-[80vh] flex flex-col" role="dialog" aria-label="Select Organization">
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => { setShowOrgModal(false); setShowLangModal(true); }} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} aria-label="Back">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f0f0f0' }}>Select Organisation</h3>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '24px' }}>Choose an organization to explore its repositories</p>
                        <div style={{ marginBottom: '16px' }}>
                            <input 
                                type="text"
                                placeholder="Search organizations..."
                                value={orgSearch}
                                onChange={(e) => setOrgSearch(e.target.value)}
                                className="modal-search-input"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                            {(() => {
                                const filteredOrgs = orgs.filter(org => org.name.toLowerCase().includes(orgSearch.toLowerCase()));
                                if (filteredOrgs.length === 0) {
                                    if (orgSearch.trim() !== '') {
                                        return (
                                            <div className="text-center py-8">
                                                <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.85rem' }}>Organization '{orgSearch}' not found in the list.</p>
                                                <button 
                                                    onClick={() => handleFallbackOrgSearch(orgSearch)}
                                                    className="modal-btn-next"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Fetching...' : `Fetch '${orgSearch}' from GitHub`}
                                                </button>
                                            </div>
                                        );
                                    }
                                    return <p style={{ color: '#555', textAlign: 'center', padding: '32px 0', fontSize: '0.85rem' }}>No organizations found for the selected criteria</p>;
                                }
                                return filteredOrgs.map((org, i) => (
                                    <button key={i} onClick={() => setSelectedOrg(org)}
                                        className={`modal-org-card ${selectedOrg?.name === org.name ? 'modal-org-selected' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            {org.avatar_url && <img src={org.avatar_url} alt={org.name} className="w-8 h-8 rounded-full" loading="lazy" />}
                                            <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{org.name}</span>
                                        </div>
                                        <span style={{ color: '#555', fontSize: '0.82rem' }} className="truncate max-w-48">{org.description?.slice(0, 50) || ''}</span>
                                    </button>
                                ));
                            })()}
                        </div>
                        <div className="flex justify-end">
                            <StatefulButton onClick={() => selectedOrg && handleOrgSelect(selectedOrg)} disabled={!selectedOrg}>
                                Select Organization
                            </StatefulButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && step !== FLOW_STEPS.BROWSE && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                    <div className="text-center">
                        <div className="mx-auto w-10 h-10 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-text-muted mt-3 animate-pulse text-sm">Loading...</p>
                    </div>
                </div>
            )}
        </>
    );
}
