import React, { useEffect, useRef } from 'react';
import { ScraperLog } from '../types';

interface TerminalLogProps {
  logs: ScraperLog[];
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="bg-black border border-slate-800 rounded-lg overflow-hidden flex flex-col h-64 font-mono text-xs shadow-2xl">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-slate-400 font-bold">System Console</span>
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
        </div>
      </div>
      <div className="p-4 overflow-y-auto flex-1 space-y-1">
        {logs.length === 0 && (
          <div className="text-slate-700 italic">System ready. Waiting for command...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start space-x-2 animate-fade-in">
            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
            <span className={`
              ${log.type === 'info' ? 'text-primary-400' : ''}
              ${log.type === 'success' ? 'text-primary-300' : ''}
              ${log.type === 'warning' ? 'text-yellow-500' : ''}
              ${log.type === 'error' ? 'text-red-500' : ''}
            `}>
              {log.type === 'success' && '> '}
              {log.type === 'error' && '! '}
              {log.type === 'warning' && '# '}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};