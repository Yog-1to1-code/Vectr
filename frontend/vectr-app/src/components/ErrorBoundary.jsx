import { Component } from 'react';

/**
 * Error boundary to catch rendering crashes.
 * In production, hides stack traces for security.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // In production, avoid logging sensitive details
        if (!import.meta.env.PROD) {
            console.error('ErrorBoundary caught:', error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-bg-primary p-8">
                    <div className="glass-card p-8 max-w-md text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-text-primary mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-text-muted text-sm mb-6">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        {/* Only show error details in development */}
                        {!import.meta.env.PROD && this.state.error && (
                            <pre className="text-xs text-status-rejected bg-bg-input rounded-lg p-3 mb-6 text-left overflow-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button onClick={this.handleReset} className="btn-secondary text-sm">
                                Try Again
                            </button>
                            <button onClick={() => window.location.reload()} className="btn-primary text-sm">
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
