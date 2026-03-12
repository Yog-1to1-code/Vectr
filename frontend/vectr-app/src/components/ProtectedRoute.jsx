import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import VectrLogo from './VectrLogo';

/**
 * Route guard. Redirects unauthenticated users to login.
 * Shows a brief loading state while auth initializes.
 */
export default function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <div className="text-center">
                    <VectrLogo size={48} />
                    <p className="text-text-muted mt-4 animate-pulse text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return children;
}
