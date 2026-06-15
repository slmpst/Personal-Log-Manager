import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Trash2 } from 'lucide-react';

interface AiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AiKeyModal: React.FC<AiKeyModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(storedKey);
      setHasKey(!!storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      setHasKey(true);
      if (onSaved) onSaved();
      onClose();
    } else {
      alert('Lütfen geçerli bir anahtar girin.');
    }
  };

  const handleDelete = () => {
    if (confirm('API anahtarını silmek istediğinize emin misiniz?')) {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      setHasKey(false);
      if (onSaved) onSaved();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Key size={16} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm md:text-base">AI Ayarları</h3>
              <p className="text-[11px] text-zinc-500">Yapay Zeka API Anahtarı Tanımlama</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
            <p>
              Uygulama içinde <strong>Gemini</strong> veya <strong>OpenAI</strong> modellerini kullanabilmek için bir API anahtarına ihtiyacınız vardır:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>OpenAI:</strong> Anahtarınız <code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px] text-zinc-300">sk-</code> ile başlamalıdır (örn: gpt-4o-mini).</li>
              <li><strong>Gemini:</strong> Standart Gemini API anahtarı girilmelidir (örn: gemini-2.5-flash).</li>
            </ul>
            <p className="text-[10px] text-zinc-550 italic">
              Anahtarınız sadece yerel tarayıcınızda (localStorage) şifrelenmeden saklanır ve her yapay zeka isteğinde doğrudan sunucuya iletilir. Sunucuda depolanmaz.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase block">API Anahtarı (API Key)</label>
            <div className="relative">
              <input
                type="password"
                placeholder={hasKey ? "••••••••••••••••••••••••••••••••••••" : "API anahtarını yapıştırın..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder-zinc-600 transition-colors"
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
          {hasKey ? (
            <button
              onClick={handleDelete}
              className="text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 border border-rose-900/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Trash2 size={13} /> Anahtarı Sil
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-550 text-[10px]">
              <ShieldCheck size={14} className="text-zinc-600" /> Şifrelenmiş Yerel Saklama
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
            >
              Kapat
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/10 transition-all cursor-pointer"
            >
              Kaydet ve Etkinleştir
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
