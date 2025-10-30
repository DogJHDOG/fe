// ReflectiveExtension.tsx
import { useState } from 'react';
import './ReflectiveExtension.css';

export interface ReflectiveCard {
    id: string;
    summary: string;
    counterPoint: string;
    source: string;
    sourceUrl: string;
    relatedQuestion: string;
    conversationId: string;
}

export interface ConversationSummary {
    conversationId: string;
    title: string;
    mainTopics: string[];
    questionCount: number;
}

interface ReflectiveExtensionProps {
    conversationSummary: ConversationSummary;
    reflectiveCards: ReflectiveCard[];
    onAskFollowUp: (card: ReflectiveCard) => void;
    onBack: () => void;
}

const ReflectiveExtension = ({ 
    conversationSummary, 
    reflectiveCards, 
    onAskFollowUp,
    onBack 
}: ReflectiveExtensionProps) => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const toggleCard = (cardId: string) => {
        setExpandedCard(expandedCard === cardId ? null : cardId);
    };

    return (
        <div className="reflective-extension">
            <div className="reflective-header">
                <button className="back-button" onClick={onBack}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    뒤로
                </button>
                <h2>💡 사고 확장하기</h2>
            </div>

            {/* 대화 요약 섹션 */}
            <div className="conversation-summary-card">
                <div className="summary-header">
                    <h3>📚 대화 요약</h3>
                    <span className="question-badge">{conversationSummary.questionCount}개의 질문</span>
                </div>
                <h4 className="summary-title">{conversationSummary.title}</h4>
                <div className="main-topics">
                    <p className="topics-label">주요 주제:</p>
                    <div className="topic-tags">
                        {conversationSummary.mainTopics.map((topic, idx) => (
                            <span key={idx} className="topic-tag">{topic}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 사고 확장 정보 섹션 */}
            <div className="reflective-content">
                <div className="content-intro">
                    <h3>🔍 다른 관점으로 바라보기</h3>
                    <p className="intro-text">
                        AI의 답변과 함께 고려해볼 수 있는 다양한 관점들입니다. 
                        각 카드를 클릭하여 자세한 내용을 확인하세요.
                    </p>
                </div>

                <div className="reflective-cards">
                    {reflectiveCards.map((card) => (
                        <div 
                            key={card.id} 
                            className={`reflective-card ${expandedCard === card.id ? 'expanded' : ''}`}
                        >
                            <div className="card-header" onClick={() => toggleCard(card.id)}>
                                <div className="card-title-section">
                                    <span className="expand-icon">
                                        {expandedCard === card.id ? '▼' : '▶'}
                                    </span>
                                    <h4>{card.summary}</h4>
                                </div>
                                <span className="related-tag">
                                    관련 질문: "{card.relatedQuestion.substring(0, 30)}..."
                                </span>
                            </div>

                            {expandedCard === card.id && (
                                <div className="card-body">
                                    <div className="counter-point">
                                        <h5>💭 보완적 관점</h5>
                                        <p>{card.counterPoint}</p>
                                    </div>

                                    <div className="card-actions">
                                        <a 
                                            href={card.sourceUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="action-button primary"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            더 알아보기
                                        </a>

                                        <button 
                                            className="action-button secondary"
                                            onClick={() => onAskFollowUp(card)}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            부가 질문하기
                                        </button>
                                    </div>

                                    <div className="source-info">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>출처: {card.source}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 하단 안내 */}
            <div className="reflective-footer">
                <div className="footer-card">
                    <h4>🎯 이 기능의 목적</h4>
                    <p>
                        AI의 답변도 하나의 관점입니다. 다양한 시각으로 정보를 바라보며 
                        더 깊이 있는 이해를 만들어가세요.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReflectiveExtension;