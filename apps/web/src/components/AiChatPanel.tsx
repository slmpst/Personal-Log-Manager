import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, Trash2, Key, MessageSquare } from 'lucide-react';
import * as aiApi from '../api/ai';
import MDEditor from '@uiw/react-md-editor';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AiChatPanelProps {
  projectId: string | null;
  activeFileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPromptKeySetup: () => void;
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  projectId,
  activeFileId,
  isOpen,
  onClose,
  onPromptKeySetup,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('layout_ai_chat_width');
    return saved ? parseInt(saved, 10) : 360;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('layout_ai_chat_width', width.toString());
  }, [width]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(280, Math.min(650, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat history or show welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          sender: 'ai',
          text: 'Merhaba! Ben sizin yapay zeka asistanınızım. Projenizdeki devlogları, notları ve raporları inceleyerek sorularınızı yanıtlayabilir veya notlarınızı analiz edebilirim.',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !projectId) return;

    const userMessageText = input.trim();
    setInput('');
    
    // Add user message
    const userMessage: Message = {
      sender: 'user',
      text: userMessageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await aiApi.chatWithProject(projectId, userMessageText, activeFileId);
      
      const aiMessage: Message = {
        sender: 'ai',
        text: response.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      let errorText = err.message || 'Yapay zeka yanıt veremedi.';
      
      // Check if the error is API key related
      const isKeyError = 
        errorText.toLowerCase().includes('api anahtarı') || 
        errorText.toLowerCase().includes('api key') ||
        errorText.toLowerCase().includes('unauthorized') ||
        errorText.toLowerCase().includes('invalid_key') ||
        errorText.toLowerCase().includes('key not found') ||
        errorText.toLowerCase().includes('401') ||
        errorText.toLowerCase().includes('403');

      const aiErrorMessage: Message = {
        sender: 'ai',
        text: isKeyError 
          ? '⚠️ **Yapay Zeka API Anahtarı Eksik veya Geçersiz.**\n\nAI özelliklerini kullanabilmek için lütfen geçerli bir API anahtarı tanımlayın. Anahtarı girdikten sonra isteğinizi tekrar gönderebilirsiniz.'
          : `❌ **Hata Oluştu:**\n\n${errorText}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiErrorMessage]);
    } finally {
      setLoading(false);
      // Refocus input field
      inputRef.current?.focus();
    }
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    if (confirm('Sohbet geçmişini temizlemek istiyor musunuz?')) {
      setMessages([
        {
          sender: 'ai',
          text: 'Sohbet geçmişi temizlendi. Proje notlarınızla ilgili sorularınızı bekliyorum!',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const suggestions = [
    "Bu projedeki kurulum rehberini özetler misin?",
    "Bugün yapılan işler listesini çıkarır mısın?",
    "Devloglarda bahsettiğim PostgreSQL hatasını nasıl çözmüştüm?"
  ];

  const handleSuggestionClick = (suggestionText: string) => {
    setInput(suggestionText);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ width: isMobile ? '100%' : `${width}px` }}
      className={`shrink-0 border-l border-zinc-850/80 bg-zinc-900/75 flex flex-col h-full z-40 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isMobile ? 'fixed inset-y-0 right-0' : 'relative'
      }`}
    >
      {/* Resizer Handle */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize group z-50 select-none"
        >
          <div className="absolute inset-y-0 left-0 w-[2px] bg-transparent group-hover:bg-indigo-500/40 group-active:bg-indigo-500 transition-colors" />
        </div>
      )}
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-850/80 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/5">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-xs text-zinc-100 tracking-wide block bg-gradient-to-r from-zinc-100 via-zinc-200 to-indigo-300 bg-clip-text text-transparent">
              Devloglarıma Sor
            </span>
            <span className="text-[9px] text-zinc-500 block">AI Geliştirici Asistanı</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            disabled={messages.length <= 1}
            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 rounded-lg transition-all cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
            title="Sohbeti Temizle"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg transition-all cursor-pointer"
            title="Kapat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-zinc-950/10 to-zinc-950/30">
        {messages.map((msg, index) => {
          const isAi = msg.sender === 'ai';
          const isWelcomeMessage = index === 0;

          return (
            <div key={index} className={`flex gap-3 animate-fade-in-up ${isAi ? 'justify-start' : 'justify-end'}`}>
              
              {/* Avatar */}
              {isAi && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-sm">
                  <Bot size={14} />
                </div>
              )}

              {/* Bubble */}
              <div className="max-w-[85%] flex flex-col gap-1.5">
                <div className={`p-3.5 rounded-2xl text-xs border leading-relaxed shadow-sm relative overflow-hidden ${
                  isAi 
                    ? 'bg-zinc-900/40 text-zinc-300 border-zinc-850/60 rounded-tl-none pl-4' 
                    : 'bg-gradient-to-br from-indigo-600/10 to-violet-600/10 text-zinc-100 border-indigo-500/15 rounded-tr-none shadow-indigo-500/5'
                }`} data-color-mode="dark">
                  
                  {/* Left accent border gradient for AI messages */}
                  {isAi && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500" />
                  )}

                  {isAi ? (
                    <div className="prose prose-xs prose-invert max-w-none">
                      <MDEditor.Markdown source={msg.text} />
                      
                      {/* Clickable Suggestions in welcome message */}
                      {isWelcomeMessage && projectId && (
                        <div className="mt-4 pt-3 border-t border-zinc-850/50">
                          <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase block mb-2 flex items-center gap-1.5">
                            <MessageSquare size={10} className="text-zinc-600" /> Önerilen Sorular
                          </span>
                          <div className="flex flex-col gap-2">
                            {suggestions.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestionClick(s)}
                                className="text-left px-3 py-2 rounded-xl bg-zinc-950/40 hover:bg-indigo-950/10 border border-zinc-850 hover:border-indigo-500/20 text-zinc-400 hover:text-indigo-300 text-[11px] transition-all duration-200 cursor-pointer active:scale-[0.99]"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {isAi && msg.text.includes('API Anahtarı Eksik') && (
                    <button
                      onClick={onPromptKeySetup}
                      className="mt-3.5 w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 cursor-pointer"
                    >
                      <Key size={12} /> API Anahtarı Tanımla
                    </button>
                  )}
                </div>
                
                <span className={`text-[8px] text-zinc-600 px-1 ${isAi ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {!isAi && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5 shadow-sm">
                  <User size={14} />
                </div>
              )}

            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-3 justify-start animate-pulse">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <Bot size={14} />
            </div>
            <div className="p-3.5 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 shrink-0 relative overflow-hidden pl-4 pr-4">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 to-violet-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-zinc-900/60 border-t border-zinc-850/80 backdrop-blur-md flex gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          placeholder={projectId ? "Sorunuzu yazın..." : "Soru sormak için proje seçin"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!projectId || loading}
          className="flex-1 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 focus:shadow-[0_0_12px_rgba(99,102,241,0.08)]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || !projectId}
          className="p-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 shadow-md shadow-indigo-500/5 hover:shadow-indigo-500/15 cursor-pointer flex items-center justify-center shrink-0 hover:scale-[1.03] active:scale-[0.97]"
        >
          <Send size={13} />
        </button>
      </form>

    </div>
  );
};
