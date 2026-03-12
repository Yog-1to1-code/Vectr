import { useState, useRef, useEffect } from 'react';
import { novaAPI } from '../services/api';

/**
 * Ask Nova AI chat panel. Integrates with Amazon Bedrock via the backend.
 * Can be used standalone on any page—just pass repo context and issues.
 */
export default function NovaChat({ repoName = '', issuesContext = [] }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMsg = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await novaAPI.ask(repoName, issuesContext, newMessages);
            setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, I couldn't process that request. ${err.message || 'Please try again.'}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="nova-card flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between py-3 px-4" style={{ borderBottom: '1px solid rgba(30,58,95,0.5)' }}>
                <h3 className="text-lg font-semibold" style={{ color: '#ec4899' }}>Ask Nova!</h3>
                {messages.length > 0 && (
                    <button
                        onClick={clearChat}
                        className="text-text-muted hover:text-text-primary text-xs transition-colors"
                        aria-label="Clear chat"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-[200px]">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                        <div className="text-3xl">🤖</div>
                        <p className="text-text-muted text-sm">Ask Nova about issues, code, or contribution strategies</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {[
                                'Summarize this issue',
                                'How should I approach this?',
                                'What files should I modify?',
                            ].map(q => (
                                <button
                                    key={q}
                                    onClick={() => { setInput(q); }}
                                    className="text-xs px-3 py-1.5 rounded-full border border-border-default/50 text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/30 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`rounded-lg p-3 text-sm fade-in whitespace-pre-wrap ${msg.role === 'user'
                                ? 'bg-bg-panel ml-6 text-text-primary'
                                : 'mr-6 text-text-secondary'
                            }`}
                        style={msg.role === 'assistant' ? { background: 'rgba(19,29,47,0.8)' } : {}}
                    >
                        {msg.content}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-text-muted text-sm p-3">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        Nova is thinking...
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(30,58,95,0.5)' }}>
                <button className="text-text-muted hover:text-text-primary transition-colors shrink-0" aria-label="Attach context" title="Attach context">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Nova..."
                    className="input-dark flex-1 text-sm !rounded-lg !py-2"
                    disabled={loading}
                    aria-label="Ask Nova a question"
                />
                <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="text-accent-cyan hover:text-accent-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    aria-label="Send message"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
