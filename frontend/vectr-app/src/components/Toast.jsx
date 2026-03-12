import { useState, useCallback, createContext, useContext } from 'react';

/**
 * Lightweight toast/notification system.
 * Usage: const { showToast } = useToast();
 *        showToast('Operation successful', 'success');
 */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[100] space-y-2 max-w-sm">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        onClick={() => dismiss(toast.id)}
                        className="fade-in px-4 py-3 rounded-lg text-sm font-medium cursor-pointer shadow-lg backdrop-blur-md"
                        style={{
                            background: toast.type === 'success' ? 'rgba(74,222,128,0.15)'
                                : toast.type === 'error' ? 'rgba(248,113,113,0.15)'
                                    : toast.type === 'warning' ? 'rgba(250,204,21,0.15)'
                                        : 'rgba(56,189,248,0.15)',
                            border: `1px solid ${toast.type === 'success' ? '#4ade80'
                                    : toast.type === 'error' ? '#f87171'
                                        : toast.type === 'warning' ? '#facc15'
                                            : '#38bdf8'
                                }`,
                            color: toast.type === 'success' ? '#4ade80'
                                : toast.type === 'error' ? '#f87171'
                                    : toast.type === 'warning' ? '#facc15'
                                        : '#38bdf8',
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}
