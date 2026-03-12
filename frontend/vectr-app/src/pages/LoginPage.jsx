import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { ROUTES, APP, EXPERIENCE_LEVELS } from '../constants';
import { useToast } from '../components/Toast';
import VectrLogo from '../components/VectrLogo';

export default function LoginPage() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [level, setLevel] = useState(EXPERIENCE_LEVELS[0].value);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleGoogleLogin = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            const data = await authAPI.googleLogin(token);
            login({
                email: data.email,
                hasPat: data.has_pat,
                authType: 'google',
                token,
                experienceLevel: data.experience_level,
            });
            showToast('Signed in successfully', 'success');
            navigate(data.has_pat ? ROUTES.DASHBOARD : ROUTES.PAT);
        } catch (err) {
            setError(err.message || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }
        setError('');
        setLoading(true);
        try {
            if (isSignup) {
                await authAPI.emailSignup(email, password, level);
                login({ email, hasPat: false, authType: 'email', experienceLevel: level });
                showToast('Account created! Now set up your GitHub PAT.', 'success');
                navigate(ROUTES.PAT);
            } else {
                const data = await authAPI.emailLogin(email, password);
                login({ email: data.email, hasPat: data.has_pat || false, authType: 'email' });
                showToast('Welcome back!', 'success');
                navigate(data.has_pat ? ROUTES.DASHBOARD : ROUTES.PAT);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const anyLoading = loading || googleLoading;

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{
            background: 'radial-gradient(ellipse at top, #0f1729 0%, #0a0e1a 50%, #060810 100%)'
        }}>
            <div className="w-full max-w-md fade-in">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <VectrLogo size={56} />
                        <span className="text-4xl font-light tracking-wider text-text-primary">{APP.NAME.toLowerCase()}</span>
                    </div>
                    <p className="text-text-muted text-sm">{APP.TAGLINE}</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-6">
                        {isSignup ? 'Create Account' : 'Welcome Back'}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg text-sm" style={{
                            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Google Sign-In */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={anyLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-border-default bg-bg-secondary text-text-primary hover:border-accent-cyan transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        id="google-signin-btn"
                    >
                        {googleLoading ? (
                            <span className="spinner"></span>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {googleLoading ? 'Signing in...' : 'Sign in with Google'}
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px flex-1 bg-border-default" />
                        <span className="text-text-muted text-xs uppercase tracking-wider">or</span>
                        <div className="h-px flex-1 bg-border-default" />
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="text-text-secondary text-sm mb-1 block">Email</label>
                            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                className="input-dark !rounded-lg" placeholder="you@example.com" required autoComplete="email" disabled={anyLoading} />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-text-secondary text-sm mb-1 block">Password</label>
                            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                                className="input-dark !rounded-lg" placeholder="••••••••" required autoComplete={isSignup ? 'new-password' : 'current-password'} disabled={anyLoading} />
                        </div>

                        {isSignup && (
                            <div>
                                <label htmlFor="level" className="text-text-secondary text-sm mb-1 block">Experience Level</label>
                                <select id="level" value={level} onChange={e => setLevel(e.target.value)}
                                    className="input-dark !rounded-lg appearance-none cursor-pointer" disabled={anyLoading}>
                                    {EXPERIENCE_LEVELS.map(l => (
                                        <option key={l.value} value={l.value}>{l.label} — {l.description}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button type="submit" disabled={anyLoading} className="btn-primary w-full !py-3 text-sm" id="auth-submit-btn">
                            {loading ? <><span className="spinner"></span> Please wait...</> : (isSignup ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-text-muted text-sm">
                        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button onClick={() => { setIsSignup(!isSignup); setError(''); }}
                            className="text-accent-cyan hover:underline font-medium" disabled={anyLoading}>
                            {isSignup ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>

                <p className="text-center mt-6 text-text-muted text-xs">{APP.POWERED_BY}</p>
            </div>
        </div>
    );
}
