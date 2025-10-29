// App.tsx
import { useState, useRef, useEffect } from 'react';
import './App.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    cards?: KnowledgeCard[];
}

interface KnowledgeCard {
    id?: string;
    summary: string;
    source: string;
}

interface BookmarkedCard extends KnowledgeCard {
    timestamp: number; 
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
    const [bookmarks, setBookmarks] = useState<BookmarkedCard[]>([]);
    const [currentView, setCurrentView] = useState<'chat' | 'bookmarks'>('chat');

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

    useEffect(() => {
        const saved = localStorage.getItem('bookmarks');
        if (saved) {
            setBookmarks(JSON.parse(saved));
        }
    }, []);

    const toggleBookmark = (card: KnowledgeCard) => {
        const cardId = `${card.summary}-${card.source}`;
        const isBookmarked = bookmarks.some(b => `${b.summary}-${b.source}` === cardId);
        
        let newBookmarks;
        if (isBookmarked) {
            newBookmarks = bookmarks.filter(b => `${b.summary}-${b.source}` !== cardId);
        } else {
            newBookmarks = [...bookmarks, { ...card, timestamp: Date.now() }];
        }
        
        setBookmarks(newBookmarks);
        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
    };

    const isCardBookmarked = (card: KnowledgeCard) => {
        const cardId = `${card.summary}-${card.source}`;
        return bookmarks.some(b => `${b.summary}-${b.source}` === cardId);
    };

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
                    <button 
                        className={`nav-button ${currentView === 'chat' ? 'active' : ''}`}
                        onClick={() => setCurrentView('chat')}
                    >
                        {/* <svg></svg> */}
                        <span>챗봇</span>
                    </button>
                    
                    <button 
                        className={`nav-button ${currentView === 'bookmarks' ? 'active' : ''}`}
                        onClick={() => setCurrentView('bookmarks')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span>북마크 ({bookmarks.length})</span>
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
                   <h2>{currentView === 'chat' ? '챗봇' : '북마크'}</h2>
                </header>
                {currentView === 'chat' && (
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
                                                        <button 
                                                            className={`bookmark-button ${isCardBookmarked(card) ? 'bookmarked' : ''}`}
                                                            onClick={() => toggleBookmark(card)}
                                                            title={isCardBookmarked(card) ? '북마크 해제' : '북마크 추가'}
                                                        >
                                                            {isCardBookmarked(card) ? '★' : '☆'}
                                                        </button>
                                                        <a href={card.source} target="_blank" rel="noopener noreferrer" className="card-link">
                                                            원문 보기
                                                            {/* 기존 SVG 아이콘 */}
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
                </div>)}
                {currentView === 'bookmarks' && (
                <div className="bookmarks-view">
                    <h3>저장된 토막 정보</h3>
                    {bookmarks.length === 0 ? (
                        <p className="empty-message">저장된 북마크가 없습니다.</p>
                    ) : (
                        <div className="cards">
                            {bookmarks.map((card, idx) => (
                                <div key={idx} className="card">
                                    <div className="card-content">
                                        <p className="card-summary">{card.summary}</p>
                                    </div>
                                    <div className="card-footer">
                                        <button 
                                            className="bookmark-button bookmarked"
                                            onClick={() => toggleBookmark(card)}
                                        >
                                            ★
                                        </button>
                                        <a href={card.source} target="_blank" rel="noopener noreferrer" className="card-link">
                                            원문 보기
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}
            </main>
        </div>
    );
}

export default App;
