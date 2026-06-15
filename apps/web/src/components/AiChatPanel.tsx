import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, Trash2, Key } from 'lucide-react';
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('layout_ai_chat_width');
    return saved ? parseInt(saved, 10) : 340;
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
      const newWidth = Math.max(250, Math.min(600, startWidth + deltaX));
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
          text: 'Merhaba! Ben sizin yapay zeka asistanınızım. Bu projedeki devloglarınızı, notlarınızı ve raporlarınızı analiz ederek sorularınızı yanıtlayabilirim.\n\n*Örnek Sorular:*\n- *"Cloudflare projesindeki kurulum rehberini özetler misin?"*\n- *"Bugün yapılan işler listesini çıkarır mısın?"*\n- *"Dünkü devlogda bahsettiğim PostgreSQL hatasını nasıl çözmüştüm?"*',
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
      
      // If error is about API key, show an explicit button
      const isKeyError = errorText.toLowerCase().includes('api anahtarı') || errorText.toLowerCase().includes('api key');

      const aiErrorMessage: Message = {
        sender: 'ai',
        text: isKeyError 
          ? '⚠️ **Yapay Zeka API Anahtarı Eksik veya Geçersiz.**\n\nAI özelliklerini kullanabilmek için lütfen bir API anahtarı girin. Anahtarı girip tekrar deneyebilirsiniz.'
          : `❌ **Hata Oluştu:**\n\n${errorText}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiErrorMessage]);

      if (isKeyError) {
        // Option to open settings directly
      }
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <div 
      style={{ width: isMobile ? '100%' : `${width}px` }}
      className={`shrink-0 border-l border-zinc-850 bg-zinc-900/50 flex flex-col h-full z-40 shadow-2xl backdrop-blur-md transition-all duration-300 ${isMobile ? 'fixed inset-y-0 right-0' : 'relative'}`}
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
      <div className="px-4 py-3 border-b border-zinc-850 flex items-center justify-between bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles size={12} className="animate-pulse" />
          </div>
          <span className="font-semibold text-xs text-zinc-200 tracking-wide">Devloglarıma Sor</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearChat}
            disabled={messages.length <= 1}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors cursor-pointer"
            title="Sohbeti Temizle"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-zinc-550 hover:text-zinc-205 rounded transition-colors cursor-pointer"
            title="Kapat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-950/20">
        {messages.map((msg, index) => {
          const isAi = msg.sender === 'ai';
          return (
            <div key={index} className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}>
              
              {/* Avatar */}
              {isAi && (
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot size={13} />
                </div>
              )}

              {/* Bubble */}
              <div className="max-w-[85%] flex flex-col gap-1">
                <div className={`p-3 rounded-2xl text-xs border leading-relaxed shadow-sm ${
                  isAi 
                    ? 'bg-zinc-900/60 text-zinc-300 border-zinc-850/60 rounded-tl-none markdown-bubble' 
                    : 'bg-indigo-600/10 text-zinc-100 border-indigo-500/10 rounded-tr-none'
                }`} data-color-mode="dark">
                  {isAi ? (
                    <div className="prose prose-xs prose-invert max-w-none">
                      <MDEditor.Markdown source={msg.text} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {isAi && msg.text.includes('API Anahtarı Eksik') && (
                    <button
                      onClick={onPromptKeySetup}
                      className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Key size={12} /> API Anahtarı Tanımla
                    </button>
                  )}
                </div>
                
                <span className={`text-[8px] text-zinc-600 ${isAi ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {!isAi && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}

            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 animate-pulse">
              <Bot size={13} />
            </div>
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-850/60 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-zinc-900 border-t border-zinc-850 flex gap-2 shrink-0">
        <input
          type="text"
          placeholder={projectId ? "Sorunuzu yazın..." : "Sorun sormak için proje seçin"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!projectId || loading}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || !projectId}
          className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send size={13} />
        </button>
      </form>

    </div>
  );
};
