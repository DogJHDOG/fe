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
    question: string;
}

interface GroupedBookmarks {
    [question: string]: BookmarkedCard[];
}

interface VerifiedConversation {
    id: string;
    title: string;
    messages: Message[];
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
    const [verifiedConversations, setVerifiedConversations] = useState<VerifiedConversation[]>([]);
    const [currentView, setCurrentView] = useState<'chat' | 'bookmarks' | 'verified'>('chat');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [conversationTitle, setConversationTitle] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const findQuestionForCard = (card: KnowledgeCard): string => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.role === 'assistant' && msg.cards) {
                const hasCard = msg.cards.some(
                    c => c.summary === card.summary && c.source === card.source
                );
                if (hasCard) {
                    for (let j = i - 1; j >= 0; j--) {
                        if (messages[j].role === 'user') {
                            return messages[j].content;
                        }
                    }
                }
            }
        }
        return '기타';
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
        const savedBookmarks = localStorage.getItem('bookmarks');
        if (savedBookmarks) {
            setBookmarks(JSON.parse(savedBookmarks));
        }

        const savedConversations = localStorage.getItem('verifiedConversations');
        if (savedConversations) {
            setVerifiedConversations(JSON.parse(savedConversations));
        }
    }, []);

    const toggleBookmark = (card: KnowledgeCard) => {
        const cardId = `${card.summary}-${card.source}`;
        const isBookmarked = bookmarks.some(b => `${b.summary}-${b.source}` === cardId);
        
        let newBookmarks;
        if (isBookmarked) {
            newBookmarks = bookmarks.filter(b => `${b.summary}-${b.source}` !== cardId);
        } else {
            const question = findQuestionForCard(card);
            newBookmarks = [...bookmarks, { 
                ...card, 
                timestamp: Date.now(),
                question: question
            }];
        }
        
        setBookmarks(newBookmarks);
        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
    };

    const isCardBookmarked = (card: KnowledgeCard) => {
        const cardId = `${card.summary}-${card.source}`;
        return bookmarks.some(b => `${b.summary}-${b.source}` === cardId);
    };

    const getGroupedBookmarks = (): GroupedBookmarks => {
        const grouped: GroupedBookmarks = {};
        
        bookmarks.forEach(bookmark => {
            const question = bookmark.question || '기타';
            if (!grouped[question]) {
                grouped[question] = [];
            }
            grouped[question].push(bookmark);
        });
        
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => b.timestamp - a.timestamp);
        });
        
        return grouped;
    };

    const handleSaveConversation = () => {
        if (!conversationTitle.trim()) return;

        const newConversation: VerifiedConversation = {
            id: Date.now().toString(),
            title: conversationTitle,
            messages: messages.filter(m => m.role !== 'assistant' || m.content !== '안녕하세요! 위키피디아 기반 AI 챗봇입니다. 무엇이 궁금하신가요?'),
            timestamp: Date.now()
        };

        const updatedConversations = [...verifiedConversations, newConversation];
        setVerifiedConversations(updatedConversations);
        localStorage.setItem('verifiedConversations', JSON.stringify(updatedConversations));
        
        setShowSaveDialog(false);
        setConversationTitle('');
        setCurrentView('verified');
    };

    const deleteConversation = (id: string) => {
        const updatedConversations = verifiedConversations.filter(c => c.id !== id);
        setVerifiedConversations(updatedConversations);
        localStorage.setItem('verifiedConversations', JSON.stringify(updatedConversations));
    };

    const downloadAsMarkdown = (conversation: VerifiedConversation) => {
        let markdown = `# ${conversation.title}\n\n`;
        markdown += `*저장일: ${new Date(conversation.timestamp).toLocaleString('ko-KR')}*\n\n`;
        markdown += `---\n\n`;

        conversation.messages.forEach((msg) => {
            if (msg.role === 'user') {
                markdown += `## 👤 질문\n\n${msg.content}\n\n`;
            } else {
                markdown += `## 🤖 답변\n\n${msg.content}\n\n`;
                
                if (msg.cards && msg.cards.length > 0) {
                    markdown += `### 📚 관련 토막 정보\n\n`;
                    msg.cards.forEach((card, idx) => {
                        markdown += `${idx + 1}. ${card.summary}\n`;
                        markdown += `   - 출처: [${card.source}](${card.source})\n\n`;
                    });
                }
            }
        });

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conversation.title}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setLoading(true);

        try {
            const conversationHistory = messages.map((m) => m.content);
            conversationHistory.push(currentInput);

            const response = await fetch('http://localhost:8000/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: conversationHistory,
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

    const groupedBookmarks = getGroupedBookmarks();
    const questionGroups = Object.keys(groupedBookmarks).sort((a, b) => {
        const latestA = Math.max(...groupedBookmarks[a].map(b => b.timestamp));
        const latestB = Math.max(...groupedBookmarks[b].map(b => b.timestamp));
        return latestB - latestA;
    });

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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
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

                    <button 
                        className={`nav-button ${currentView === 'verified' ? 'active' : ''}`}
                        onClick={() => setCurrentView('verified')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>검증된 대화 ({verifiedConversations.length})</span>
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
                   <h2>
                       {currentView === 'chat' ? '챗봇' : 
                        currentView === 'bookmarks' ? '북마크' : '검증된 대화 내용'}
                   </h2>
                   {currentView === 'chat' && messages.length > 1 && (
                       <button 
                           className="save-conversation-btn"
                           onClick={() => setShowSaveDialog(true)}
                       >
                           대화 저장
                       </button>
                   )}
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
                )}

                {currentView === 'bookmarks' && (
                    <div className="bookmarks-view">
                        <h3>저장된 토막 정보</h3>
                        {bookmarks.length === 0 ? (
                            <p className="empty-message">저장된 북마크가 없습니다.</p>
                        ) : (
                            <div className="bookmark-groups">
                                {questionGroups.map((question, groupIdx) => (
                                    <div key={groupIdx} className="bookmark-group">
                                        <h4 className="group-title">
                                            <span className="question-icon">Q</span>
                                            {question}
                                        </h4>
                                        <div className="cards">
                                            {groupedBookmarks[question].map((card, idx) => (
                                                <div key={idx} className="card">
                                                    <div className="card-content">
                                                        <p className="card-summary">{card.summary}</p>
                                                    </div>
                                                    <div className="card-footer">
                                                        <button 
                                                            className="bookmark-button bookmarked"
                                                            onClick={() => toggleBookmark(card)}
                                                            title="북마크 해제"
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {currentView === 'verified' && (
                    <div className="verified-view">
                        <h3>저장된 검증된 대화</h3>
                        {verifiedConversations.length === 0 ? (
                            <p className="empty-message">저장된 대화가 없습니다.</p>
                        ) : (
                            <div className="verified-list">
                                {verifiedConversations
                                    .sort((a, b) => b.timestamp - a.timestamp)
                                    .map((conv) => (
                                        <div key={conv.id} className="verified-item">
                                            <div className="verified-header">
                                                <h4>{conv.title}</h4>
                                                <div className="verified-actions">
                                                    <button 
                                                        className="action-btn download"
                                                        onClick={() => downloadAsMarkdown(conv)}
                                                        title="마크다운으로 다운로드"
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        className="action-btn delete"
                                                        onClick={() => deleteConversation(conv.id)}
                                                        title="삭제"
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="verified-date">
                                                {new Date(conv.timestamp).toLocaleString('ko-KR')}
                                            </p>
                                            <div className="verified-preview">
                                                {conv.messages.slice(0, 2).map((msg, idx) => (
                                                    <div key={idx} className="preview-message">
                                                        <strong>{msg.role === 'user' ? '질문:' : '답변:'}</strong>
                                                        <span>{msg.content.substring(0, 100)}...</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="dialog-overlay" onClick={() => setShowSaveDialog(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>대화 저장</h3>
                        <p className="dialog-desc">이 대화 내용을 검증된 대화로 저장합니다.</p>
                        <input
                            type="text"
                            className="dialog-input"
                            placeholder="대화 제목을 입력하세요"
                            value={conversationTitle}
                            onChange={(e) => setConversationTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveConversation();
                                }
                            }}
                            autoFocus
                        />
                        <div className="dialog-actions">
                            <button 
                                className="dialog-btn cancel"
                                onClick={() => {
                                    setShowSaveDialog(false);
                                    setConversationTitle('');
                                }}
                            >
                                취소
                            </button>
                            <button 
                                className="dialog-btn confirm"
                                onClick={handleSaveConversation}
                                disabled={!conversationTitle.trim()}
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;