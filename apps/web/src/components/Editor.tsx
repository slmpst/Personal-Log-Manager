import React, { useState, useEffect, useRef } from 'react';
import { DevFile } from '../types';
import MDEditor from '@uiw/react-md-editor';
import { Eye, Edit3, Columns, FileText, Pin, Check, Upload, ChevronLeft, FileDown, Copy, Sparkles, ChevronDown, Loader2, X, Paperclip, ChevronUp, Trash2, ExternalLink, FileArchive, Image, Video, File, Bot } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import mermaid from 'mermaid';
import * as aiApi from '../api/ai';
import * as filesApi from '../api/files';

interface EditorProps {
  file: DevFile;
  onUpdateFileContent: (id: string, content: string) => Promise<void>;
  onUpdateFileTitle: (id: string, title: string) => Promise<void>;
  onBack?: () => void;
  isAiChatOpen?: boolean;
  onToggleAiChat?: () => void;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (mimetype: string) => {
  const mime = mimetype.toLowerCase();
  if (mime.startsWith('image/')) return <Image size={16} className="text-emerald-400" />;
  if (mime.startsWith('video/')) return <Video size={16} className="text-amber-400" />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <FileArchive size={16} className="text-indigo-400" />;
  return <File size={16} className="text-zinc-400" />;
};

let globalCheckboxCount = 0;
export const resetCheckboxCount = () => {
  globalCheckboxCount = 0;
};

const CustomInput = (props: any) => {
  if (props.type === 'checkbox') {
    const index = globalCheckboxCount++;
    return (
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => {
          const event = new CustomEvent('toggle-todo', {
            detail: { index, checked: e.target.checked }
          });
          window.dispatchEvent(event);
        }}
        className="mr-1.5 accent-indigo-500 cursor-pointer rounded border-zinc-800 w-3.5 h-3.5 mt-0.5 shrink-0"
      />
    );
  }
  return <input {...props} />;
};

const MermaidRenderer = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;
      
      // Generate a fresh unique ID for this render run to avoid ID collisions
      const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      
      try {
        setError(null);

        // Clean leading indentation of the code block
        const lines = code.trim().split('\n');
        let minSpaces = Infinity;
        for (const line of lines) {
          if (line.trim() === '') continue;
          const match = line.match(/^( *)/);
          if (match) {
            minSpaces = Math.min(minSpaces, match[1].length);
          }
        }
        
        const cleanedCode = (minSpaces === Infinity || minSpaces === 0) 
          ? code.trim() 
          : lines.map(line => line.trim() === '' ? '' : line.substring(minSpaces)).join('\n');

        const { svg: renderedSvg } = await mermaid.render(renderId, cleanedCode);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error(err);
        setError('Diyagram çizilemedi. Lütfen Mermaid yazım kurallarını kontrol edin.');
      }
    };
    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <pre className="text-rose-400 text-xs bg-rose-950/20 border border-rose-900/30 p-4 rounded-lg my-4 font-mono whitespace-pre-wrap">
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-8 bg-zinc-900/20 border border-zinc-800 rounded-lg my-4 animate-pulse">
        <span className="text-xs text-zinc-500">Diyagram çiziliyor...</span>
      </div>
    );
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: svg }} 
      className="flex justify-center my-6 overflow-x-auto p-4 bg-zinc-900/20 border border-zinc-850/60 rounded-xl" 
    />
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalanamadı', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 p-1 rounded bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-550 hover:text-zinc-350 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-lg z-10"
      title="Kodu Kopyala"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
};

const CustomPre = (props: any) => {
  const { children, ...rest } = props;
  
  const childrenArray = React.Children.toArray(children);
  const codeChild = childrenArray.find(
    (child: any) => child && (child.type === 'code' || (child.props && child.props.className))
  ) as any;

  if (codeChild) {
    const className = codeChild.props.className || '';
    const match = /language-(\w+)/.exec(className);
    const lang = match ? match[1] : '';
    const codeContent = codeChild.props.children || '';

    if (lang === 'mermaid') {
      return <MermaidRenderer code={String(codeContent).replace(/\n$/, '')} />;
    }

    return (
      <div className="relative group my-4">
        <pre {...rest} className={`${props.className || ''} pr-10 overflow-x-auto`}>
          {children}
        </pre>
        <CopyButton text={String(codeContent).replace(/\n$/, '')} />
      </div>
    );
  }

  return <pre {...props} />;
};



export const Editor: React.FC<EditorProps> = ({
  file,
  onUpdateFileContent,
  onUpdateFileTitle,
  onBack,
  isAiChatOpen,
  onToggleAiChat,
}) => {
  const { editorMode, setEditorMode } = useUiStore();
  const [title, setTitle] = useState(file.title);
  const [content, setContent] = useState(file.content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const selectionStartRef = useRef<number | null>(null);
  const selectionEndRef = useRef<number | null>(null);

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiSelectionText, setAiSelectionText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<filesApi.NoteAttachment[]>([]);
  const [isFetchingAttachments, setIsFetchingAttachments] = useState(false);
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activePreviewTab, setActivePreviewTab] = useState<'original' | 'result'>('result');

  // Load attachments when active file changes
  useEffect(() => {
    const loadAttachments = async () => {
      setIsFetchingAttachments(true);
      try {
        const data = await filesApi.fetchAttachments(file.id);
        setAttachments(data);
      } catch (err) {
        console.error('Failed to load attachments:', err);
      } finally {
        setIsFetchingAttachments(false);
      }
    };
    loadAttachments();
    // Reset collapsed state on file change
    setIsAttachmentsExpanded(false);
  }, [file.id]);

  const handleAttachmentUpload = async (uploadFileObj: File) => {
    setIsUploadingFile(true);
    try {
      const response = await filesApi.uploadAttachment(file.id, uploadFileObj);
      setAttachments(prev => [response, ...prev]);
      // Auto expand to show uploaded file
      setIsAttachmentsExpanded(true);
    } catch (err: any) {
      console.error(err);
      alert('Dosya yüklenemedi: ' + err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
    if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
    try {
      await filesApi.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (err: any) {
      console.error(err);
      alert('Dosya silinemedi: ' + err.message);
    }
  };

  const handleAttachmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleAttachmentUpload(selectedFiles[0]);
    }
  };

  const handleAiCommand = async (command: string) => {
    setShowAiMenu(false);
    
    // Get selection text
    let selection = '';
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      const textarea = activeEl as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== undefined && end !== undefined && start !== end) {
        selection = textarea.value.substring(start, end);
        selectionStartRef.current = start;
        selectionEndRef.current = end;
      } else {
        selectionStartRef.current = null;
        selectionEndRef.current = null;
      }
    } else {
      selectionStartRef.current = null;
      selectionEndRef.current = null;
    }
    
    setAiSelectionText(selection || null);
    setIsAiLoading(true);
    setAiError(null);
    
    try {
      const response = await aiApi.runEditorCommand(command, content, selection || null);
      setAiResult(response.result);
      setAiPreviewOpen(true);
    } catch (err: any) {
      console.error('AI command error:', err);
      const isKeyError = err.message?.toLowerCase().includes('api anahtarı') || err.message?.toLowerCase().includes('api key');
      if (isKeyError) {
        setAiError('Yapay zeka API anahtarı bulunamadı veya geçersiz. Lütfen sağ üstteki AI ayarlarına gidin veya Ayarlar panelinden bir anahtar girin.');
      } else {
        setAiError(err.message || 'Yapay zeka yanıtı işlenirken bir hata oluştu.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  resetCheckboxCount();

  useEffect(() => {
    const handleToggleTodo = (e: Event) => {
      const { index, checked } = (e as CustomEvent).detail;
      handleTodoToggle(index, checked);
    };
    window.addEventListener('toggle-todo', handleToggleTodo);
    return () => window.removeEventListener('toggle-todo', handleToggleTodo);
  }, [content]);

  const handleTodoToggle = (targetIndex: number, checked: boolean) => {
    let currentCheckboxIndex = 0;
    const newContent = content.replace(/(^|\n)(\s*[-*+]\s+)\[([\sxX])\]/g, (match, p1, p2, _p3) => {
      const isMatch = currentCheckboxIndex === targetIndex;
      currentCheckboxIndex++;
      if (isMatch) {
        return `${p1}${p2}[${checked ? 'x' : ' '}]`;
      }
      return match;
    });

    handleContentChange(newContent);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const previewElement = document.querySelector('.wmde-markdown');
    const previewHtml = previewElement ? previewElement.innerHTML : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${file.title}</title>
          <style>
            body {
              font-family: 'Outfit', sans-serif;
              color: #1f2937;
              padding: 2rem;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #111827;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            code {
              background-color: #f3f4f6;
              padding: 0.2em 0.4em;
              border-radius: 4px;
              font-family: monospace;
              font-size: 0.9em;
            }
            pre {
              background-color: #f3f4f6;
              padding: 1rem;
              border-radius: 8px;
              overflow-x: auto;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1.5rem 0;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 0.75rem;
              text-align: left;
            }
            th {
              background-color: #f9fafb;
            }
            blockquote {
              border-left: 4px solid #e5e7eb;
              padding-left: 1rem;
              color: #4b5563;
              margin: 1.5rem 0;
              font-style: italic;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <h1 style="border-b: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 2rem;">${file.title}</h1>
          <div>${previewHtml}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportHTML = () => {
    const previewElement = document.querySelector('.wmde-markdown');
    const previewHtml = previewElement ? previewElement.innerHTML : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${file.title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #1f2937;
      padding: 2rem;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #111827;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    code {
      background-color: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }
    pre {
      background-color: #f3f4f6;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.75rem;
      text-align: left;
    }
    th {
      background-color: #f9fafb;
    }
    blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 1rem;
      color: #4b5563;
      margin: 1.5rem 0;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1 style="border-b: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 2rem;">${file.title}</h1>
  <div>${previewHtml}</div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.title.toLowerCase().replace(/\s+/g, '-')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.title.toLowerCase().replace(/\s+/g, '-')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && editorMode === 'split') {
        setEditorMode('edit');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [editorMode, setEditorMode]);


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      const fileExtension = droppedFile.name.split('.').pop()?.toLowerCase();
      const textExtensions = ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'xml', 'yaml', 'yml'];

      if (textExtensions.includes(fileExtension || '')) {
        const choice = confirm(
          `"${droppedFile.name}" metin dosyası algılandı.\n\n[Tamam]'a tıklayarak bu dosyanın içeriğini nota aktarabilir (notun mevcut içeriği silinir),\n[İptal]'e tıklayarak dosyayı bu nota eklenti/dosya olarak ekleyebilirsiniz.`
        );
        if (choice) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            handleContentChange(text);
          };
          reader.readAsText(droppedFile);
        } else {
          handleAttachmentUpload(droppedFile);
        }
      } else {
        handleAttachmentUpload(droppedFile);
      }
    }
  };

  // Sync state when file changes
  useEffect(() => {
    setTitle(file.title);
    setContent(file.content);
    setSaveStatus('saved');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, [file.id, file.title, file.content]);

  const handleContentChange = (val?: string) => {
    const newContent = val || '';
    setContent(newContent);
    setSaveStatus('saving');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await onUpdateFileContent(file.id, newContent);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
      }
    }, 800);
  };

  const handleTitleBlur = async () => {
    if (!title.trim() || title === file.title) {
      setTitle(file.title);
      return;
    }
    try {
      await onUpdateFileTitle(file.id, title.trim());
    } catch (err) {
      setTitle(file.title);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-zinc-900 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors mr-0.5 shrink-0"
              title="Geri"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <FileText size={18} className="text-zinc-500 shrink-0 hidden sm:inline" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleBlur();
            }}
            className="bg-transparent text-base md:text-lg font-semibold text-zinc-100 border-b border-transparent hover:border-zinc-805 focus:border-indigo-500 focus:outline-none py-0.5 px-1 min-w-0 max-w-[240px] sm:max-w-[320px] md:max-w-[400px] truncate transition-colors flex-1"
          />
          {file.pinned && (
            <span className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-medium shrink-0" title="Sabitlenmiş">
              <Pin size={10} className="fill-indigo-400/20" />
              <span className="hidden sm:inline">Sabit</span>
            </span>
          )}
          <span className="text-xs text-zinc-500 hidden sm:inline shrink-0">
            • {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true, locale: tr })} güncellendi
          </span>
        </div>

        {/* Actions / Modes */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0">
          {/* Save Status Indicator */}
          <span className="text-xs shrink-0" title={saveStatus === 'saved' ? 'Değişiklikler kaydedildi' : saveStatus === 'saving' ? 'Kaydediliyor...' : 'Hata oluştu!'}>
            {saveStatus === 'saved' && (
              <span className="text-emerald-500 flex items-center gap-1.5 font-medium">
                <Check size={13} />
                <span className="hidden sm:inline">Kaydedildi</span>
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-zinc-550 animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-ping" />
                <span className="hidden sm:inline">Kaydediliyor...</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-500 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="hidden sm:inline">Hata Oluştu!</span>
              </span>
            )}
          </span>

          {/* AI Chat Panel Toggle */}
          {onToggleAiChat && (
            <button
              onClick={onToggleAiChat}
              className={`p-1.5 rounded-md transition-all cursor-pointer border ${
                isAiChatOpen 
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                  : 'text-zinc-450 hover:text-zinc-300 border-zinc-800 bg-zinc-900'
              }`}
              title="AI Asistana Sor (Sohbet)"
            >
              <Bot size={14} />
            </button>
          )}

          {/* AI Dropdown */}
          <div className="relative font-sans">
            <button
              onClick={() => setShowAiMenu(!showAiMenu)}
              className="p-1.5 rounded-md border border-indigo-500/30 bg-indigo-550/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-500/5"
              title="Yapay Zeka Yardımcısı"
              disabled={isAiLoading}
            >
              {isAiLoading ? (
                <Loader2 size={14} className="animate-spin text-indigo-400" />
              ) : (
                <Sparkles size={14} className="animate-pulse" />
              )}
              <span className="hidden sm:inline">Yapay Zeka</span>
              <ChevronDown size={12} className={`hidden sm:inline transition-transform duration-200 ${showAiMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showAiMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAiMenu(false)} />
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 flex flex-col gap-1">
                  <div className="px-2 py-1 text-[10px] text-zinc-500 font-semibold tracking-wider uppercase border-b border-zinc-850 mb-1">
                    AI Komutları
                  </div>
                  <button
                    onClick={() => handleAiCommand('draft-to-devlog')}
                    className="w-full text-left px-2.5 py-2 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-sm">📝</span> Taslağı Devloga Dönüştür
                  </button>
                  <button
                    onClick={() => handleAiCommand('fix-code')}
                    className="w-full text-left px-2.5 py-2 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-sm">🐛</span> Hata Bul & Düzelt
                  </button>
                  <button
                    onClick={() => handleAiCommand('generate-mermaid')}
                    className="w-full text-left px-2.5 py-2 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-sm">📊</span> Şema Üret (Mermaid)
                  </button>
                  <button
                    onClick={() => handleAiCommand('continue-writing')}
                    className="w-full text-left px-2.5 py-2 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-sm">✍️</span> Yazıyı Devam Ettir
                  </button>
                  <button
                    onClick={() => handleAiCommand('summarize')}
                    className="w-full text-left px-2.5 py-2 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-sm">🔍</span> Kısa Özet Çıkar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* File Attachment Upload Button */}
          <div className="relative">
             <button
              onClick={() => attachmentFileInputRef.current?.click()}
              className="p-1.5 rounded-md border border-zinc-805 bg-zinc-905 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Nota Özel Dosya Ekle"
              disabled={isUploadingFile}
            >
              {isUploadingFile ? (
                <Loader2 size={14} className="animate-spin text-zinc-400" />
              ) : (
                <Paperclip size={14} />
              )}
              <span className="hidden sm:inline">Dosya Ekle</span>
            </button>
            <input
              type="file"
              ref={attachmentFileInputRef}
              onChange={handleAttachmentFileChange}
              className="hidden"
            />
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Dışa Aktar"
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">Dışa Aktar</span>
            </button>
            
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl p-1 z-50 flex flex-col gap-0.5">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportPDF();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded transition-colors cursor-pointer"
                  >
                    PDF Olarak Aktar
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportHTML();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded transition-colors cursor-pointer"
                  >
                    HTML Olarak Aktar
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportMarkdown();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-350 hover:text-zinc-100 hover:bg-zinc-805 rounded transition-colors cursor-pointer"
                  >
                    Markdown Olarak İndir
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setEditorMode('edit')}
              className={`p-1.5 rounded-md transition-colors ${
                editorMode === 'edit' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-355'
              }`}
              title="Editör"
            >
              <Edit3 size={15} />
            </button>
            <button
              onClick={() => setEditorMode('split')}
              className={`p-1.5 rounded-md transition-colors hidden md:inline-block ${
                editorMode === 'split' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-355'
              }`}
              title="Yan Yana"
            >
              <Columns size={15} />
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={`p-1.5 rounded-md transition-colors ${
                editorMode === 'preview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-355'
              }`}
              title="Önizleme"
            >
              <Eye size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content Workspace */}
      <div 
        className="flex-1 flex flex-col min-h-0 relative" 
        data-color-mode="dark"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <MDEditor
            value={content}
            onChange={handleContentChange}
            preview={editorMode === 'split' ? 'live' : editorMode}
            height="100%"
            hideToolbar={false}
            previewOptions={{
              components: {
                pre: CustomPre,
                input: CustomInput
              }
            }}
          />
        </div>

        {isDraggingFile && (
          <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-sm border-2 border-dashed border-indigo-500/35 rounded-xl m-4 z-50 flex flex-col items-center justify-center pointer-events-none transition-all">
            <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col items-center gap-3 max-w-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Upload size={22} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-zinc-200 font-semibold text-xs uppercase tracking-wider">Eklenti Dosyası Ekle</h4>
                <p className="text-zinc-550 text-[11px] mt-1 leading-relaxed">
                  Dosyayı bu nota eklenti/dosya olarak yüklemek için buraya bırakın.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Note-specific Attachments Bottom Section */}
        <div className="shrink-0 flex flex-col bg-zinc-900/50 border-t border-zinc-850 backdrop-blur-md relative z-10 font-sans">
          {/* Bar Header */}
          <div 
            onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
            className="h-11 px-4 flex items-center justify-between hover:bg-zinc-900 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Paperclip size={14} className="text-zinc-450" />
              <span className="font-semibold text-xs text-zinc-300">Nota Özel Dosyalar</span>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {attachments.length} Dosya
              </span>
              {isUploadingFile && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 animate-pulse ml-2">
                  <Loader2 size={10} className="animate-spin text-zinc-505" /> Dosya Yükleniyor...
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => attachmentFileInputRef.current?.click()}
                className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                + Dosya Yükle
              </button>
              <button
                onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
                className="p-1 text-zinc-500 hover:text-zinc-350 transition-colors cursor-pointer"
              >
                {isAttachmentsExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
          </div>

          {/* Expanded Attachments Grid */}
          {isAttachmentsExpanded && (
            <div className="max-h-56 overflow-y-auto bg-zinc-950/40 border-t border-zinc-900/60 p-4 custom-scrollbar">
              {isFetchingAttachments ? (
                <div className="flex items-center justify-center py-6 text-zinc-550 gap-2 text-center">
                  <Loader2 size={14} className="animate-spin text-zinc-500" />
                  <span className="text-xs">Dosyalar yükleniyor...</span>
                </div>
              ) : attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-zinc-550 gap-1 text-center">
                  <Paperclip size={24} className="text-zinc-700 stroke-[1.5] animate-pulse" />
                  <p className="text-xs font-semibold text-zinc-400 mt-1">Henüz eklenmiş dosya yok</p>
                  <p className="text-[10px] text-zinc-650 leading-relaxed">
                    Nota özel dosyaları ve belgeleri buradan yükleyip yönetebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {attachments.map((att) => (
                    <div 
                      key={att.id}
                      className="bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 p-2.5 rounded-xl flex items-center justify-between gap-3 group transition-all"
                    >
                      <a 
                        href={att.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2.5 min-w-0 flex-1 hover:text-zinc-200 transition-colors"
                        title={att.name}
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          {getFileIcon(att.mimetype)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-300 truncate">{att.name}</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{formatBytes(att.size)}</p>
                        </div>
                      </a>
                      
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-zinc-500 hover:text-zinc-350 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Aç / İndir"
                        >
                          <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={() => handleAttachmentDelete(att.id)}
                          className="p-1 text-zinc-550 hover:text-rose-450 rounded hover:bg-rose-950/20 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Apply Preview Dialog */}
      {aiPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 font-sans">
          <div className="relative w-full max-w-3xl h-[92vh] sm:h-[85vh] bg-zinc-900 border border-zinc-800 rounded-none sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-850 bg-zinc-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm md:text-base">AI Değişiklik Önizlemesi</h3>
                  <p className="text-[11px] text-zinc-500">
                    {aiSelectionText ? 'Seçilen alan için oluşturulan içerik' : 'Belge geneli için oluşturulan içerik'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAiPreviewOpen(false);
                  setAiResult('');
                  setAiSelectionText(null);
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Tab Switcher */}
            {aiSelectionText && (
              <div className="md:hidden flex border-b border-zinc-850 bg-zinc-900 shrink-0">
                <button
                  onClick={() => setActivePreviewTab('original')}
                  className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
                    activePreviewTab === 'original'
                      ? 'border-indigo-500 text-indigo-400 bg-zinc-850/20'
                      : 'border-transparent text-zinc-505 hover:text-zinc-350'
                  }`}
                >
                  Orijinal
                </button>
                <button
                  onClick={() => setActivePreviewTab('result')}
                  className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
                    activePreviewTab === 'result'
                      ? 'border-indigo-500 text-indigo-400 bg-zinc-850/20'
                      : 'border-transparent text-zinc-505 hover:text-zinc-300'
                  }`}
                >
                  Yapay Zeka Sonucu
                </button>
              </div>
            )}

            {/* Split Preview Panels */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-850 overflow-hidden bg-zinc-950/20">
              {/* Left Panel: Original Context (if selection was used) or Info */}
              {aiSelectionText ? (
                <div className={`flex-1 flex-col min-h-0 p-4 space-y-2 ${activePreviewTab === 'original' ? 'flex' : 'hidden md:flex'}`}>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Orijinal (Seçili Metin)</span>
                  <div className="flex-1 bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 overflow-y-auto font-mono text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed select-all">
                    {aiSelectionText}
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex flex-col min-h-0 p-4 space-y-3 justify-center items-center text-center max-w-xs mx-auto shrink-0">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-300">Belge Geneli İşlemi</h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Herhangi bir metin seçilmediği için yapay zeka tüm belge içeriğini analiz ederek yeni bir sonuç üretti.
                    </p>
                  </div>
                </div>
              )}

              {/* Right Panel: AI Generation Preview */}
              <div className={`flex-1 flex-col min-h-0 p-4 space-y-2 ${!aiSelectionText || activePreviewTab === 'result' ? 'flex' : 'hidden md:flex'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="text-indigo-400" /> Yapay Zeka Sonucu
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiResult)}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors text-[10px] px-2 py-1 font-medium cursor-pointer"
                  >
                    Sonucu Kopyala
                  </button>
                </div>
                
                {/* Result Preview Container */}
                <div className="flex-1 bg-zinc-950/80 border border-zinc-850/80 rounded-xl overflow-y-auto p-4 md-preview-container" data-color-mode="dark">
                  <MDEditor.Markdown source={aiResult} />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-zinc-850 bg-zinc-900/90 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-zinc-550 italic max-w-sm hidden sm:inline">
                "Uygula" butonuna bastığınızda değişiklikler editördeki metne otomatik olarak aktarılacaktır.
              </span>
              
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => {
                    setAiPreviewOpen(false);
                    setAiResult('');
                    setAiSelectionText(null);
                  }}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-805 rounded-xl transition-all cursor-pointer font-medium"
                >
                  İptal Et
                </button>
                
                {aiSelectionText ? (
                  <button
                    onClick={() => {
                      // Replace selected text
                      const start = selectionStartRef.current;
                      const end = selectionEndRef.current;
                      if (start !== null && end !== null) {
                        const newContent = content.substring(0, start) + aiResult + content.substring(end);
                        handleContentChange(newContent);
                      } else {
                        const newContent = content.replace(aiSelectionText, aiResult);
                        handleContentChange(newContent);
                      }
                      setAiPreviewOpen(false);
                      setAiResult('');
                      setAiSelectionText(null);
                    }}
                    className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-650/10 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Seçimi Değiştir
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Overwrite everything
                        handleContentChange(aiResult);
                        setAiPreviewOpen(false);
                        setAiResult('');
                        setAiSelectionText(null);
                      }}
                      className="px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium rounded-xl transition-all cursor-pointer"
                    >
                      Tümünü Değiştir
                    </button>
                    <button
                      onClick={() => {
                        // Append to the end
                        const newContent = content + (content ? "\n\n" : "") + aiResult;
                        handleContentChange(newContent);
                        setAiPreviewOpen(false);
                        setAiResult('');
                        setAiSelectionText(null);
                      }}
                      className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-650/10 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      Sonuna Ekle
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Error Alert Modal */}
      {aiError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 font-sans">
          <div className="w-full max-w-md bg-zinc-900 border border-rose-900/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">AI Asistanı Hatası</h3>
                <p className="text-[10px] text-rose-400/80">İşlem gerçekleştirilemedi</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-850/60 whitespace-pre-wrap">
              {aiError}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAiError(null)}
                className="px-4 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
