import React, { useState } from 'react';
import { DevFile, FileType } from '../types';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, isSameDay, addMonths, subMonths,
  isToday
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText, Terminal, BookOpen, StickyNote, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';

interface CalendarViewProps {
  files: DevFile[];
}

const FILE_TYPE_COLORS: Record<FileType, string> = {
  rapor: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  devlog: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  bilgiler: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  notlar: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  todo: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  rapor: <FileText size={12} className="text-blue-400" />,
  devlog: <Terminal size={12} className="text-emerald-400" />,
  bilgiler: <BookOpen size={12} className="text-purple-400" />,
  notlar: <StickyNote size={12} className="text-amber-400" />,
  todo: <CheckSquare size={12} className="text-rose-400" />,
};

export const CalendarView: React.FC<CalendarViewProps> = ({ files }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { setActiveFileId } = useUiStore();

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getFilesForDay = (day: Date) => {
    return files.filter(f => isSameDay(new Date(f.createdAt), day));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 p-4 md:p-6 overflow-hidden select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-sm md:text-lg font-bold text-zinc-100 capitalize leading-none mb-1">
              {format(currentMonth, 'MMMM yyyy', { locale: tr })}
            </h2>
            <p className="text-[11px] text-zinc-550">
              Bu ay toplam {files.filter(f => format(new Date(f.createdAt), 'yyyy-MM') === format(currentMonth, 'yyyy-MM')).length} devlog/not yazıldı.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-zinc-850 bg-zinc-900/60 py-2.5 text-center text-[10px] md:text-xs font-bold text-zinc-500 tracking-wider uppercase shrink-0">
          <span>Pzt</span>
          <span>Sal</span>
          <span>Çar</span>
          <span>Per</span>
          <span>Cum</span>
          <span>Cmt</span>
          <span>Paz</span>
        </div>

        {/* Days grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 min-h-0 divide-x divide-y divide-zinc-850/40">
          {days.map((day, idx) => {
            const dayFiles = getFilesForDay(day);
            const isCurrentMonth = format(day, 'MM') === format(currentMonth, 'MM');
            const today = isToday(day);

            return (
              <div
                key={idx}
                className={`p-1 md:p-2 flex flex-col min-h-0 transition-colors ${
                  isCurrentMonth ? 'bg-transparent' : 'bg-zinc-950/20 text-zinc-650'
                } ${today ? 'bg-indigo-500/[0.02]' : ''}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <span
                    className={`text-[10px] md:text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center ${
                      today
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : isCurrentMonth
                        ? 'text-zinc-400'
                        : 'text-zinc-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Day files list */}
                <div className="flex-1 overflow-y-auto flex flex-row flex-wrap gap-1 md:flex-col md:space-y-1 pr-1 custom-scrollbar">
                  {dayFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setActiveFileId(file.id)}
                      className={`rounded text-[9px] md:text-[10px] font-medium border flex items-center gap-1 md:gap-1.5 transition-all hover:scale-[1.02] cursor-pointer ${FILE_TYPE_COLORS[file.type]} w-auto px-1 py-0.5 md:w-full md:text-left md:px-1.5 md:py-1`}
                      title={file.title}
                    >
                      <span className="shrink-0">{FILE_TYPE_ICONS[file.type]}</span>
                      <span className="truncate hidden md:inline">{file.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
