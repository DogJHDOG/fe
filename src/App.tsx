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

interface MetacognitiveInsight {
    topic: string;
    card_id: string;
    search_keywords: string[];
}

interface ExternalVerification {
    topic: string;
    summary: string;
    source: string;
    follow_up_questions: string[];  // 추가된 필드
}

interface ConversationAnalysis {
    overall_summary: string;
    metacognitive_insights: MetacognitiveInsight[];
    external_verifications: ExternalVerification[];
    analyzed_at?: string;
    message_count?: number;
}

interface VerifiedConversation {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
    analysis?: ConversationAnalysis;
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
    const [analyzing, setAnalyzing] = useState(false);

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
        console.log('🔄 [INIT] 앱 초기화 시작');
        
        const savedBookmarks = localStorage.getItem('bookmarks');
        if (savedBookmarks) {
            const bookmarksData = JSON.parse(savedBookmarks);
            console.log('📚 [LOAD] 북마크 로드:', bookmarksData);
            setBookmarks(bookmarksData);
        } else {
            console.log('📚 [LOAD] 저장된 북마크 없음');
        }

        const savedConversations = localStorage.getItem('verifiedConversations');
        if (savedConversations) {
            const conversationsData = JSON.parse(savedConversations);
            console.log('✅ [LOAD] 검증된 대화 로드:', conversationsData);
            setVerifiedConversations(conversationsData);
        } else {
            console.log('✅ [LOAD] 저장된 검증된 대화 없음');
        }
        
        console.log('🔄 [INIT] 앱 초기화 완료');
    }, []);

    const toggleBookmark = (card: KnowledgeCard) => {
        console.log('⭐ [BOOKMARK] 북마크 토글 시도:', card);
        
        const cardId = `${card.summary}-${card.source}`;
        const isBookmarked = bookmarks.some(b => `${b.summary}-${b.source}` === cardId);
        
        let newBookmarks;
        if (isBookmarked) {
            console.log('⭐ [BOOKMARK] 북마크 제거');
            newBookmarks = bookmarks.filter(b => `${b.summary}-${b.source}` !== cardId);
        } else {
            const question = findQuestionForCard(card);
            console.log('⭐ [BOOKMARK] 북마크 추가, 연결된 질문:', question);
            newBookmarks = [...bookmarks, { 
                ...card, 
                timestamp: Date.now(),
                question: question
            }];
        }
        
        console.log('⭐ [BOOKMARK] 업데이트된 북마크 목록:', newBookmarks);
        setBookmarks(newBookmarks);
        localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
        console.log('⭐ [BOOKMARK] localStorage에 저장 완료');
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

    const analyzeConversation = async (messagesToAnalyze: Message[]): Promise<ConversationAnalysis | null> => {
        try {
            console.log('🔍 [ANALYZE] 대화 분석 시작');
            console.log('🔍 [ANALYZE] 분석할 메시지 수:', messagesToAnalyze.length);
            
            setAnalyzing(true);
            
            // Filter out initial greeting
            const relevantMessages = messagesToAnalyze.filter(
                m => m.role !== 'assistant' || m.content !== '안녕하세요! 위키피디아 기반 AI 챗봇입니다. 무엇이 궁금하신가요?'
            );
            
            console.log('🔍 [ANALYZE] 필터링 후 메시지 수:', relevantMessages.length);
            console.log('🔍 [ANALYZE] 전송할 메시지:', relevantMessages.map(m => ({
                role: m.role,
                content: m.content.substring(0, 50) + '...'
            })));
            
            const response = await fetch('http://localhost:8000/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: relevantMessages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                }),
            });

            console.log('🔍 [ANALYZE] 응답 상태:', response.status);
            console.log()
            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.status}`);
            }

            const analysis: ConversationAnalysis = await response.json();
            console.log('🔍 [ANALYZE] 분석 결과 수신:', analysis);
            console.log('🔍 [ANALYZE] - 전체 요약:', analysis.overall_summary);
            console.log('🔍 [ANALYZE] - 메타인지 인사이트 수:', analysis.metacognitive_insights?.length || 0);
            console.log('🔍 [ANALYZE] - 외부 검증 수:', analysis.external_verifications?.length || 0);
            console.log('🔍 [ANALYZE] - 다음 질문:', analysis.external_verifications[0].follow_up_questions || []);
            
            if (analysis.external_verifications) {
                analysis.external_verifications.forEach((ver, idx) => {
                    console.log(`🔍 [ANALYZE] - 검증 ${idx + 1}:`, {
                        topic: ver.topic,
                        hasFollowUp: !!ver.follow_up_questions,
                        followUpCount: ver.follow_up_questions?.length || 0
                    });
                });
            }
            
            return analysis;
        } catch (error) {
            console.error('❌ [ANALYZE] 분석 중 오류 발생:', error);
            return null;
        } finally {
            setAnalyzing(false);
            console.log('🔍 [ANALYZE] 분석 완료');
        }
    };

    const handleSaveConversation = async () => {
        if (!conversationTitle.trim()) return;

        console.log('💾 [SAVE] 대화 저장 시작');
        console.log('💾 [SAVE] 제목:', conversationTitle);

        // Analyze conversation before saving
        const analysis = await analyzeConversation(messages);

        const newConversation: VerifiedConversation = {
            id: Date.now().toString(),
            title: conversationTitle,
            messages: messages.filter(m => m.role !== 'assistant' || m.content !== '안녕하세요! 위키피디아 기반 AI 챗봇입니다. 무엇이 궁금하신가요?'),
            timestamp: Date.now(),
            analysis: analysis || undefined
        };

        console.log('💾 [SAVE] 저장할 대화 데이터:', {
            id: newConversation.id,
            title: newConversation.title,
            messageCount: newConversation.messages.length,
            hasAnalysis: !!newConversation.analysis,
            timestamp: new Date(newConversation.timestamp).toLocaleString()
        });

        const updatedConversations = [...verifiedConversations, newConversation];
        console.log('💾 [SAVE] 업데이트된 대화 목록 (총 개수):', updatedConversations.length);
        
        setVerifiedConversations(updatedConversations);
        localStorage.setItem('verifiedConversations', JSON.stringify(updatedConversations));
        console.log('💾 [SAVE] localStorage에 저장 완료');
        
        setShowSaveDialog(false);
        setConversationTitle('');
        setCurrentView('verified');
        console.log('💾 [SAVE] 검증된 대화 뷰로 이동');
    };

    const deleteConversation = (id: string) => {
        console.log('🗑️ [DELETE] 대화 삭제 시도, ID:', id);
        
        const conversationToDelete = verifiedConversations.find(c => c.id === id);
        if (conversationToDelete) {
            console.log('🗑️ [DELETE] 삭제할 대화:', conversationToDelete.title);
        }
        
        const updatedConversations = verifiedConversations.filter(c => c.id !== id);
        console.log('🗑️ [DELETE] 삭제 후 남은 대화 수:', updatedConversations.length);
        
        setVerifiedConversations(updatedConversations);
        localStorage.setItem('verifiedConversations', JSON.stringify(updatedConversations));
        console.log('🗑️ [DELETE] 삭제 완료 및 localStorage 업데이트');
    };

    const downloadAsMarkdown = (conversation: VerifiedConversation) => {
        console.log('📥 [DOWNLOAD] 마크다운 다운로드 시작');
        console.log('📥 [DOWNLOAD] 대화 제목:', conversation.title);
        
        let markdown = `# ${conversation.title}\n\n`;
        markdown += `*저장일: ${new Date(conversation.timestamp).toLocaleString('ko-KR')}*\n\n`;
        markdown += `---\n\n`;

        // Add analysis if available
        if (conversation.analysis) {
            console.log('📥 [DOWNLOAD] 분석 데이터 포함');
            markdown += `## 대화 분석\n\n`;
            markdown += `### 전체 요약\n${conversation.analysis.overall_summary}\n\n`;
            
            if (conversation.analysis.metacognitive_insights.length > 0) {
                console.log('📥 [DOWNLOAD] 메타인지 인사이트 수:', conversation.analysis.metacognitive_insights.length);
                markdown += `### 🧠 메타인지 인사이트\n\n`;
                conversation.analysis.metacognitive_insights.forEach((insight, idx) => {
                    markdown += `${idx + 1}. **${insight.topic}** (${insight.card_id})\n`;
                    markdown += `   - 검색 키워드: ${insight.search_keywords.join(', ')}\n\n`;
                });
            }
            
            if (conversation.analysis.external_verifications.length > 0) {
                console.log('📥 [DOWNLOAD] 외부 검증 수:', conversation.analysis.external_verifications.length);
                markdown += `### 🔍 외부 검증 정보\n\n`;
                conversation.analysis.external_verifications.forEach((verification, idx) => {
                    markdown += `${idx + 1}. **${verification.topic}**\n`;
                    markdown += `   - ${verification.summary}\n`;
                    markdown += `   - 출처: [${verification.source}](${verification.source})\n\n`;
                });
            }
            
            markdown += `---\n\n`;
        }

        markdown += `## 💬 대화 내용\n\n`;
        console.log('📥 [DOWNLOAD] 메시지 수:', conversation.messages.length);
        
        conversation.messages.forEach((msg) => {
            if (msg.role === 'user') {
                markdown += `### 👤 질문\n\n${msg.content}\n\n`;
            } else {
                markdown += `### 🤖 답변\n\n${msg.content}\n\n`;
                
                if (msg.cards && msg.cards.length > 0) {
                    markdown += `#### 📚 관련 토막 정보\n\n`;
                    msg.cards.forEach((card, idx) => {
                        markdown += `${idx + 1}. ${card.summary}\n`;
                        markdown += `   - 출처: [${card.source}](${card.source})\n\n`;
                    });
                }
            }
        });

        console.log('📥 [DOWNLOAD] 마크다운 생성 완료, 길이:', markdown.length);

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conversation.title}.md`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📥 [DOWNLOAD] 다운로드 완료');
    };

    // 새로운 함수: 후속 질문으로 채팅 시작
    const startChatWithQuestion = async (question: string) => {
        console.log('🔄 [FOLLOW-UP] 후속 질문으로 채팅 시작');
        console.log('🔄 [FOLLOW-UP] 질문:', question);
        
        // 채팅 뷰로 전환
        setCurrentView('chat');
        console.log('🔄 [FOLLOW-UP] 채팅 뷰로 전환');
        
        // input에 질문 설정
        setInput(question);
        console.log('🔄 [FOLLOW-UP] input에 질문 설정 완료');
        
        // 잠시 후 자동으로 전송
        setTimeout(async () => {
            console.log('🔄 [FOLLOW-UP] 질문 자동 전송 시작');
            
            const userMessage: Message = { role: 'user', content: question };
            setMessages((prev) => {
                console.log('🔄 [FOLLOW-UP] 이전 메시지 수:', prev.length);
                return [...prev, userMessage];
            });
            setInput('');
            setLoading(true);

            try {
                const conversationHistory = messages.map((m) => m.content);
                conversationHistory.push(question);
                
                console.log('🔄 [FOLLOW-UP] API 호출 시작');
                console.log('🔄 [FOLLOW-UP] 대화 히스토리 길이:', conversationHistory.length);

                const response = await fetch('http://localhost:8000/api/query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        question: conversationHistory,
                    }),
                });

                console.log('🔄 [FOLLOW-UP] API 응답 상태:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('🔄 [FOLLOW-UP] API 응답 데이터:', data);
                console.log('🔄 [FOLLOW-UP] 지식 카드 수:', data.cards?.length || 0);

                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.answer,
                    cards: data.cards || [],
                };
                
                setMessages((prev) => {
                    console.log('🔄 [FOLLOW-UP] 응답 추가 후 총 메시지 수:', prev.length + 1);
                    return [...prev, assistantMessage];
                });
                
                console.log('🔄 [FOLLOW-UP] 질문 및 응답 완료');
            } catch (error) {
                console.error('❌ [FOLLOW-UP] 오류 발생:', error);
                const errorMessage: Message = {
                    role: 'assistant',
                    content: '죄송합니다. 오류가 발생했습니다.',
                };
                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setLoading(false);
                console.log('🔄 [FOLLOW-UP] 로딩 상태 해제');
            }
        }, 100);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        console.log('💬 [SEND] 메시지 전송 시작');
        console.log('💬 [SEND] 입력:', input);

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => {
            console.log('💬 [SEND] 이전 메시지 수:', prev.length);
            return [...prev, userMessage];
        });
        const currentInput = input;
        setInput('');
        setLoading(true);

        try {
            const conversationHistory = messages.map((m) => m.content);
            conversationHistory.push(currentInput);
            
            console.log('💬 [SEND] API 호출 시작');
            console.log('💬 [SEND] 대화 히스토리 길이:', conversationHistory.length);

            const response = await fetch('http://localhost:8000/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: conversationHistory,
                }),
            });

            console.log('💬 [SEND] API 응답 상태:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('💬 [SEND] API 응답 데이터:', data);
            console.log('💬 [SEND] 답변 길이:', data.answer?.length || 0);
            console.log('💬 [SEND] 지식 카드 수:', data.cards?.length || 0);
            
            if (data.cards && data.cards.length > 0) {
                console.log('💬 [SEND] 지식 카드 상세:', data.cards.map((c: KnowledgeCard) => ({
                    summary: c.summary.substring(0, 50) + '...',
                    source: c.source
                })));
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.answer,
                cards: data.cards || [],
            };
            
            setMessages((prev) => {
                console.log('💬 [SEND] 응답 추가 후 총 메시지 수:', prev.length + 1);
                return [...prev, assistantMessage];
            });
            
            console.log('💬 [SEND] 메시지 전송 완료');
        } catch (error) {
            console.error('❌ [SEND] 오류 발생:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: '죄송합니다. 오류가 발생했습니다.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
            console.log('💬 [SEND] 로딩 상태 해제');
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

    const getCardIcon = (cardId: string): string => {
        switch (cardId) {
            case 'CARD_TRADE_OFF': return '⚖️';
            case 'CARD_CONTEXT': return '💡';
            case 'CARD_PRECONDITION': return '🎯';
            case 'CARD_EDGE_CASE': return '🐛';
            default: return '📝';
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
                           disabled={analyzing}
                       >
                           {analyzing ? '분석 중...' : '대화 저장'}
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
                                            
                                            {/* Analysis Section */}
                                            {conv.analysis && (
                                                <div className="analysis-section">
                                                    <h5 className="analysis-title">대화 분석</h5>
                                                    <p className="analysis-summary">{conv.analysis.overall_summary}</p>
                                                    
                                                    {conv.analysis.metacognitive_insights.length > 0 && (
                                                        <div className="insights-grid">
                                                            {conv.analysis.metacognitive_insights.map((insight, idx) => (
                                                                <div key={idx} className="insight-card">
                                                                    <span className="insight-icon">{getCardIcon(insight.card_id)}</span>
                                                                    <span className="insight-topic">{insight.topic}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {conv.analysis.external_verifications.length > 0 && (
                                                        <div className="verifications">
                                                            <h6 className="verifications-title">새로운 학습 내용이 도착했어요</h6>
                                                            {conv.analysis.external_verifications.map((ver, idx) => (
                                                                <div key={idx} className="verification-item">
                                                                    <p className="verification-summary">{ver.summary}</p>
                                                                    <div className="verification-footer">
                                                                        <a href={ver.source} target="_blank" rel="noopener noreferrer" 
                                                                           className="verification-link">
                                                                            출처 확인
                                                                        </a>
                                                                    </div>
                                                                    
                                                                    {/* 후속 질문 버튼들 */}
                                                                    {ver.follow_up_questions && ver.follow_up_questions.length > 0 && (
                                                                        <div className="follow-up-questions">
                                                                            <p className="follow-up-label">후속 질문</p>
                                                                            <div className="follow-up-buttons">
                                                                                {ver.follow_up_questions.map((question, qIdx) => (
                                                                                    <button
                                                                                        key={qIdx}
                                                                                        className="follow-up-btn"
                                                                                        onClick={() => startChatWithQuestion(question)}
                                                                                        title="이 질문으로 새 대화 시작"
                                                                                    >
                                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                                                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                                                        </svg>
                                                                                        {question}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* <div className="verified-preview">
                                                {conv.messages.slice(0, 2).map((msg, idx) => (
                                                    <div key={idx} className="preview-message">
                                                        <strong>{msg.role === 'user' ? '질문:' : '답변:'}</strong>
                                                        <span>{msg.content.substring(0, 100)}...</span>
                                                    </div>
                                                ))}
                                            </div> */}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="dialog-overlay" onClick={() => !analyzing && setShowSaveDialog(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>대화 저장 및 분석</h3>
                        <p className="dialog-desc">
                            {analyzing 
                                ? '대화를 분석하고 있습니다. 잠시만 기다려주세요...'
                                : '이 대화 내용을 검증된 대화로 저장하고 AI가 분석합니다.'}
                        </p>
                        <input
                            type="text"
                            className="dialog-input"
                            placeholder="대화 제목을 입력하세요"
                            value={conversationTitle}
                            onChange={(e) => setConversationTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !analyzing) {
                                    handleSaveConversation();
                                }
                            }}
                            disabled={analyzing}
                            autoFocus
                        />
                        <div className="dialog-actions">
                            <button 
                                className="dialog-btn cancel"
                                onClick={() => {
                                    setShowSaveDialog(false);
                                    setConversationTitle('');
                                }}
                                disabled={analyzing}
                            >
                                취소
                            </button>
                            <button 
                                className="dialog-btn confirm"
                                onClick={handleSaveConversation}
                                disabled={!conversationTitle.trim() || analyzing}
                            >
                                {analyzing ? '분석 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;