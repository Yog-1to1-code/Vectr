import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patAPI } from '../services/api';
import { ROUTES, APP } from '../constants';
import { useToast } from '../components/Toast';
import VectrLogo from '../components/VectrLogo';

const PAT_STEPS = [
    { action: 'Go to', target: 'GitHub Settings → Developer Settings' },
    { action: 'Click', target: 'Personal access tokens → Tokens (classic)' },
    { action: 'Click', target: 'Generate new token (classic)' },
    { action: 'Select scopes:', target: 'repo, read:org, read:user' },
    { action: 'Click', target: 'Generate token and copy it' },
];

export default function PATPage() {
    const [pat, setPat] = useState('');
    const [showPat, setShowPat] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleSubmit = async () => {
        const trimmed = pat.trim();
        if (!trimmed) {
            setError('Please enter your GitHub Personal Access Token');
            return;
        }
        if (!trimmed.startsWith('ghp_') && !trimmed.startsWith('github_pat_')) {
            setError('Invalid PAT format. GitHub PATs start with ghp_ or github_pat_');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await patAPI.validate(user.email, trimmed);
            updateUser({ hasPat: true, githubUsername: data.github_username });
            showToast(`PAT validated! Welcome, ${data.github_username}`, 'success');
            setTimeout(() => navigate(ROUTES.DASHBOARD), 800);
        } catch (err) {
            setError(err.message || 'Failed to validate PAT. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-16 p-4" style={{
            background: 'radial-gradient(ellipse at top, #0f1729 0%, #0a0e1a 50%, #060810 100%)'
        }}>
            <div className="flex items-center gap-3 mb-12">
                <VectrLogo size={52} />
                <span className="text-3xl font-light tracking-wider text-text-primary">{APP.NAME.toLowerCase()}</span>
            </div>

            <div className="glass-card-accent w-full max-w-xl p-8 fade-in">
                <h2 className="text-xl font-semibold mb-6" style={{ color: '#4ade80' }}>Github PAT</h2>

                <div className="text-text-secondary text-sm leading-relaxed mb-8">
                    <p className="mb-3">Follow these steps to generate your Personal Access Token:</p>
                    <ol className="list-decimal list-inside space-y-2 text-text-muted">
                        {PAT_STEPS.map((step, i) => (
                            <li key={i}>{step.action} <span className="text-accent-cyan">{step.target}</span></li>
                        ))}
                    </ol>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg text-sm" style={{
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171'
                    }}>
                        {error}
                    </div>
                )}

                <div className="relative mb-6">
                    <input
                        id="pat-input"
                        type={showPat ? 'text' : 'password'}
                        value={pat}
                        onChange={e => setPat(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="input-dark pr-12"
                        autoComplete="off"
                        aria-label="GitHub Personal Access Token"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPat(!showPat)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                        aria-label={showPat ? 'Hide PAT' : 'Show PAT'}
                        tabIndex={-1}
                    >
                        {showPat ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(ROUTES.LOGIN)} className="btn-secondary text-sm" disabled={loading}>Back</button>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary" id="pat-submit-btn">
                        {loading ? <><span className="spinner"></span> Validating...</> : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
}
