import React, { useCallback } from 'react';
import { Clip } from '../types';
import { Trash2, Film, Image as ImageIcon, Wand2 } from 'lucide-react';

interface TimelineProps {
    clips: Clip[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onDelete: (index: number) => void;
    onReorder: (from: number, to: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ 
    clips, 
    selectedIndex, 
    onSelect, 
    onDelete,
    onReorder
}) => {
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (dragIndex !== dropIndex) {
            onReorder(dragIndex, dropIndex);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (selectedIndex < clips.length - 1) onSelect(selectedIndex + 1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (selectedIndex > 0) onSelect(selectedIndex - 1);
        } else if (e.key === 'Delete') {
            e.preventDefault();
            if (clips[selectedIndex]) onDelete(selectedIndex);
        }
    }, [selectedIndex, clips, onSelect, onDelete]);

    return (
        <div className="w-full bg-zinc-900 border-t border-zinc-800 h-60 flex flex-col shrink-0 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.5)] z-10" role="group" aria-label="Timeline Sequencer">
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
                        <Film size={16} className="text-indigo-500" />
                        <span>Sequencer</span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700 mx-1"></div>
                    <span className="text-xs text-zinc-400">{clips.length} Clips</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700/50">
                        {clips.reduce((acc, c) => acc + c.duration, 0).toFixed(1)}s Duration
                    </span>
                </div>
            </div>
            <div 
                className="flex-1 overflow-x-auto overflow-y-hidden p-5 flex gap-3 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-900/50" 
                role="list" 
                tabIndex={0} 
                onKeyDown={handleKeyDown}
                aria-label="Clips list (use arrow keys to navigate, delete to remove)"
            >
                {clips.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800/50 rounded-xl bg-zinc-950/30 mx-auto max-w-2xl">
                        <div className="bg-zinc-900 p-3 rounded-full mb-2">
                            <Film size={24} className="text-zinc-600" />
                        </div>
                        <p className="font-medium text-sm text-zinc-300">Timeline Empty</p>
                        <p className="text-xs mt-1 text-zinc-500">Drag media here or add from library</p>
                    </div>
                )}
                
                {clips.map((clip, index) => (
                    <div 
                        key={clip.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragOver={handleDragOver}
                        onClick={() => onSelect(index)}
                        role="listitem"
                        aria-label={`Clip ${index + 1}, duration ${clip.duration} seconds${clip.audioUrl ? ', has voiceover' : ''}${index === selectedIndex ? ', selected' : ''}`}
                        aria-current={index === selectedIndex ? 'true' : undefined}
                        tabIndex={-1}
                        className={`
                            relative flex-shrink-0 w-36 h-36 rounded-xl overflow-hidden border-2 cursor-pointer group transition-all duration-200
                            ${index === selectedIndex 
                                ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-black/50 z-10 scale-[1.02]' 
                                : 'border-zinc-700 hover:border-zinc-500 hover:shadow-md hover:scale-[1.01] opacity-90 hover:opacity-100'}
                        `}
                    >
                        {/* Clip Content */}
                        {clip.thumbnail ? (
                            <img src={clip.thumbnail} className="w-full h-full object-cover" alt="thumb" />
                        ) : (
                             clip.type === 'video' ? 
                             <video src={clip.url} className="w-full h-full object-cover pointer-events-none" /> :
                             <img src={clip.url} className="w-full h-full object-cover pointer-events-none" alt="clip" />
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        {/* Type Badge */}
                        <div className="absolute top-2 left-2 z-20">
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-1.5 rounded-lg text-white shadow-sm">
                                {clip.type === 'video' && <Film size={12} />}
                                {clip.type === 'image' && <ImageIcon size={12} />}
                                {clip.type === 'ai_generated' && <Wand2 size={12} className="text-purple-400" />}
                            </div>
                        </div>

                        {/* Info Area - CLEANED UP */}
                        <div className="absolute inset-x-0 bottom-0 p-3 z-20">
                            {/* Removed clip.name to avoid ugly filenames */}
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-white">Clip {index + 1}</p>
                                <span className="text-[10px] text-zinc-300 font-mono bg-black/50 px-1.5 rounded">
                                    {clip.duration}s
                                </span>
                            </div>
                            {clip.audioUrl && (
                                <div className="mt-1 inline-flex items-center gap-1 bg-indigo-500/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                                    Voice
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all transform translate-x-2 group-hover:translate-x-0 shadow-lg z-30"
                            title="Remove clip"
                        >
                            <Trash2 size={14} />
                        </button>
                        
                        {/* Selection Border Overlay */}
                        {index === selectedIndex && (
                            <div className="absolute inset-0 border-2 border-indigo-500 rounded-xl pointer-events-none z-30" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
