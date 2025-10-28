// App.tsx
import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    cards?: KnowledgeCard[];
}

interface KnowledgeCard {
    summary: string;
    source: string;
}

function App() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: '안녕하세요! 위키피디아 기반 AI 챗봇입니다. 무엇이 궁금하신가요?',
            cards: [],
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setLoading(true);

        try {
            // 전체 대화 히스토리를 배열로 구성 (user와 assistant 메시지 모두 포함)
            const conversationHistory = messages.map((m) => m.content);
            conversationHistory.push(currentInput);

            const response = await fetch('http://localhost:8000/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: conversationHistory, // 전체 대화 히스토리
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received data:', data);

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.answer,
                cards: data.cards || [],
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: '죄송합니다. 오류가 발생했습니다.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="app">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="logo">WikiRAG</h1>
                    <p className="subtitle">신뢰할 수 있는 지식</p>
                </div>

                <nav className="nav">
                    <button className="nav-button active">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <span>챗봇</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="info-box">
                        <p className="info-title">💡 MVP 모킹</p>
                        <p className="info-desc">위키피디아 기반 RAG 챗봇</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main">
                <header className="header">
                    <h2>챗봇</h2>
                </header>

                <div className="chat-container">
                    <div className="messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className="message-group">
                                <div className={`message ${msg.role}`}>
                                    <div className="message-bubble">
                                        <p>{msg.content}</p>
                                    </div>
                                </div>

                                {msg.cards && msg.cards.length > 0 && (
                                    <div className="cards-container">
                                        <p className="cards-title">💡 관련 토막 정보</p>
                                        <div className="cards">
                                            {msg.cards.map((card, cardIdx) => (
                                                <div key={cardIdx} className="card">
                                                    <div className="card-content">
                                                        <p className="card-summary">
                                                            {card.summary}
                                                        </p>
                                                    </div>
                                                    <div className="card-footer">
                                                        <a
                                                            href={card.source}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="card-link"
                                                        >
                                                            원문 보기
                                                            <svg
                                                                width="12"
                                                                height="12"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                                />
                                                            </svg>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="message-group">
                                <div className="message assistant">
                                    <div className="message-bubble">
                                        <div className="typing">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="input-area">
                        <div className="input-wrapper">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="위키피디아에 대해 질문해보세요..."
                                disabled={loading}
                                rows={1}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="send-button"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
