import React, { useState, useRef, useEffect } from 'react';
import { 
    Layout, Plus, Upload, Wand2, Settings, 
    Download, MessageSquare, Mic, Video, Image as ImageIcon, Type as TypeIcon, Trash2, Clock, Volume2, AlertCircle
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Types
import { Clip, ClipType, Project, AspectRatio, CaptionStyle } from './types';
import { useProjectStore } from './store/projectStore';

// Components
import { Button } from './components/Button';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import ErrorBoundary from './components/ErrorBoundary';

// Services
import { generateVideoScript, generateTTS, generateCaptionForScene } from './services/geminiService';

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
    fontFamily: 'Inter',
    fontSize: 32,
    color: '#ffffff',
    position: 'bottom',
    backgroundColor: 'rgba(0,0,0,0.6)'
};

const FONTS = ['Inter', 'Roboto', 'Lobster', 'Oswald', 'Playfair Display'];
const COLORS = ['#ffffff', '#000000', '#facc15', '#ef4444', '#3b82f6', '#22c55e'];
const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const App: React.FC = () => {
    // --- State ---
    const {
        project,
        selectedClipIndex,
        setSelectedClipIndex,
        addClips,
        addGeneratedScenes,
        updateClip,
        deleteClip,
        reorderClips,
        setAspectRatio,
        hydrate,
        persist,
        undo,
        redo
    } = useProjectStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTool, setActiveTool] = useState<'script' | 'voice' | 'media' | 'text' | 'settings'>('media');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // AI Inputs
    const [scriptTopic, setScriptTopic] = useState('');
    const [scenePrompt, setScenePrompt] = useState('');
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingSceneScript, setIsGeneratingSceneScript] = useState(false);
    
    const [ttsText, setTtsText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrlsRef = useRef<Set<string>>(new Set());

    // --- Effects ---
    // Cleanup all blob URLs on unmount to avoid memory leaks
    useEffect(() => {
        hydrate();
        return () => {
            objectUrlsRef.current.forEach(url => {
                try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
            });
            objectUrlsRef.current.clear();
        };
    }, []);

    // Persist on project change (debounced simple)
    useEffect(() => {
        const id = setTimeout(() => persist(), 400);
        return () => clearTimeout(id);
    }, [project]);

    // --- Handlers ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        addClips(Array.from(files));
        if (project.clips.length === 0) setActiveTool('text');
    };

    const handleDeleteClip = (index: number) => {
        deleteClip(index);
    };

    const handleReorderClips = (from: number, to: number) => {
        reorderClips(from, to);
    };

    const handleUpdateClip = (index: number, updates: Partial<Clip>) => {
        updateClip(index, updates);
    };

    const handleGenerateScript = async () => {
        if (!scriptTopic) return;
        setIsGeneratingScript(true);
        try {
            const result = await generateVideoScript(scriptTopic, "Viral, Fast-paced");
            if (result && result.scenes) {
                addGeneratedScenes(result.scenes);
                // Pre-fill voiceover text for convenience, but don't burn it into caption yet
                setTtsText(result.scenes[0].voiceover); 
                setActiveTool('voice');
                setSelectedClipIndex(project.clips.length); 
            }
        } catch (err) {
            setErrorMessage("Failed to generate script. Please try again.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateSceneCaption = async () => {
        if (!scenePrompt || !activeClip) return;
        setIsGeneratingSceneScript(true);
        try {
            const caption = await generateCaptionForScene(scenePrompt);
            if (caption) {
                handleUpdateClip(selectedClipIndex, { script: caption });
            }
        } catch (err) {
            setErrorMessage('Failed to generate caption for scene.');
        } finally {
            setIsGeneratingSceneScript(false);
        }
    };

    const handleGenerateVoiceover = async () => {
        if (!ttsText || !activeClip) return;
        setIsGeneratingVoice(true);
        setErrorMessage(null);
        try {
            console.log('[Voice] Generating TTS:', { text: ttsText, voice: selectedVoice });
            const audioUrl = await generateTTS(ttsText, selectedVoice);
            console.log('[Voice] TTS result:', audioUrl ? 'Success' : 'No URL');
            if (audioUrl) {
                handleUpdateClip(selectedClipIndex, { audioUrl });
            } else {
                setErrorMessage("No audio returned from TTS.");
            }
        } catch (err: any) {
            console.error('[Voice] TTS error:', err);
            setErrorMessage(err?.message || "Failed to generate voiceover.");
        } finally {
            setIsGeneratingVoice(false);
        }
    };

    const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activeClip) {
            const url = URL.createObjectURL(e.target.files[0]);
            handleUpdateClip(selectedClipIndex, { audioUrl: url });
        }
    };

    const handleExport = () => {
        setIsPlaying(false);
        setIsExporting(true);
        setErrorMessage(null);
    };

    const handleCancelExport = () => {
        setIsExporting(false);
    };

    const handleExportComplete = (blob: Blob) => {
        setIsExporting(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.replace(/\s+/g, '_')}.webm`;
        a.click();
    };

    const activeClip = project.clips[selectedClipIndex];

    return (
        <div className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 z-20 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-cyan-600 p-1.5 rounded-lg">
                        <Layout className="text-white w-5 h-5" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight text-white">Buzz Roll</h1>
                </div>
                
                <div className="flex items-center gap-4">
                     <div className="text-xs text-zinc-500 mr-2">
                        {project.clips.length} clips • {project.clips.reduce((a,b) => a + b.duration, 0).toFixed(1)}s total
                     </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={undo} disabled={project.clips.length === 0}>Undo</Button>
                        <Button variant="secondary" size="sm" onClick={redo} disabled={false}>Redo</Button>
                    </div>
                    <Button variant="primary" size="sm" className="gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={handleExport} disabled={project.clips.length === 0 || isExporting}>
                        <Download size={16} /> {isExporting ? 'Rendering...' : 'Stitch & Export'}
                    </Button>
                </div>
            </header>
            <div className="sr-only" aria-live="polite">
                {isExporting ? 'Export started' : 'Export idle'}
                {errorMessage ? ` Error: ${errorMessage}` : ''}
            </div>
            {errorMessage && (
                <div className="px-4 py-2 bg-red-950/60 border-b border-red-800 text-red-300 text-xs flex items-center justify-between" role="alert">
                    <span>{errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200" aria-label="Dismiss error" title="Dismiss error">Dismiss</button>
                </div>
            )}

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                
                {/* Tools Sidebar (Left) */}
                <aside className="w-16 border-r border-zinc-800 bg-zinc-900 flex flex-col items-center py-4 gap-4 shrink-0">
                    <NavButton icon={<Upload size={20} />} label="Media" active={activeTool === 'media'} onClick={() => setActiveTool('media')} />
                    <NavButton icon={<TypeIcon size={20} />} label="Text" active={activeTool === 'text'} onClick={() => setActiveTool('text')} />
                    <NavButton icon={<MessageSquare size={20} />} label="Script" active={activeTool === 'script'} onClick={() => setActiveTool('script')} />
                    <NavButton icon={<Mic size={20} />} label="Voice" active={activeTool === 'voice'} onClick={() => setActiveTool('voice')} />
                    <NavButton icon={<Settings size={20} />} label="Config" active={activeTool === 'settings'} onClick={() => setActiveTool('settings')} />
                </aside>

                {/* Tools Panel (Slide-out) */}
                <div className="w-80 border-r border-zinc-800 bg-zinc-900/95 flex flex-col shrink-0">
                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
                        
                        {activeTool === 'media' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-2 text-white">Media Library</h2>
                                    
                                    {/* Replacement for Button component to fix 'cut off' layout issues */}
                                    <label className="w-full border-2 border-dashed border-zinc-700 rounded-xl h-32 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-500 hover:bg-zinc-800/50 transition-all">
                                        <input type="file" multiple accept="video/*,image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                        <div className="bg-zinc-800 p-3 rounded-full">
                                            <Plus className="w-6 h-6 text-zinc-400" />
                                        </div>
                                        <span className="text-zinc-400 text-xs font-medium">Click to Upload Media</span>
                                    </label>
                                </div>

                                {activeClip && (
                                    <div className="bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                            <Settings size={14} className="text-indigo-400" /> Clip Properties
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                                                    <Clock size={12} /> Duration (seconds)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    min="0.1"
                                                    step="0.5"
                                                    value={activeClip.duration}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val > 0) {
                                                            handleUpdateClip(selectedClipIndex, { duration: val });
                                                        }
                                                    }}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                                                    aria-label="Clip duration (seconds)"
                                                    title="Clip duration (seconds)"
                                                />
                                                <p className="text-[10px] text-zinc-500 leading-tight">
                                                    {activeClip.type === 'video' 
                                                        ? 'Video will stop playing after this time.' 
                                                        : 'How long this image appears on screen.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-zinc-800 pt-4">
                                    <h3 className="text-sm font-medium text-zinc-300 mb-3">Timeline Assets</h3>
                                    {project.clips.length === 0 ? (
                                        <p className="text-xs text-zinc-500 text-center py-8">No media added yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {project.clips.map((clip, idx) => (
                                                <div 
                                                    key={clip.id} 
                                                    onClick={() => setSelectedClipIndex(idx)} 
                                                    className={`cursor-pointer relative aspect-square rounded bg-black border overflow-hidden group ${idx === selectedClipIndex ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-zinc-800 hover:border-zinc-600'}`}
                                                >
                                                    {clip.type === 'video' ? (
                                                        <video src={clip.url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={clip.url} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 truncate text-[10px] text-white">
                                                        {clip.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTool === 'text' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-1 text-white">Text & Captions</h2>
                                    <p className="text-xs text-zinc-400 mb-4">Edit overlays for the selected clip.</p>
                                </div>

                                {!activeClip && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded mb-4">
                                        <div className="flex gap-2 text-yellow-500 items-start">
                                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                            <p className="text-xs">Select a clip in the timeline to enable text editing.</p>
                                        </div>
                                    </div>
                                )}

                                <div className={`space-y-6 ${!activeClip ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Caption Content</label>
                                        <textarea 
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none resize-none h-24 leading-snug"
                                            placeholder="Type caption here... (Supports multi-line)"
                                            value={activeClip?.script || ''}
                                            disabled={!activeClip}
                                            onChange={(e) => handleUpdateClip(selectedClipIndex, { script: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Font Family</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {FONTS.map(font => {
                                                const isActive = activeClip?.style?.fontFamily === font;
                                                return (
                                                    <button
                                                        key={font}
                                                        onClick={() => handleUpdateClip(selectedClipIndex, { style: { ...activeClip?.style!, fontFamily: font } })}
                                                        disabled={!activeClip}
                                                        className={`p-2 rounded text-sm border truncate ${isActive ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                                                    >
                                                        {font}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Color</label>
                                        <div className="flex gap-2">
                                            {COLORS.map(color => {
                                                const isColor = activeClip?.style?.color === color;
                                                return (
                                                    <button
                                                        key={color}
                                                        onClick={() => handleUpdateClip(selectedClipIndex, { style: { ...activeClip?.style!, color } })}
                                                        disabled={!activeClip}
                                                        className={`w-8 h-8 rounded-full border-2 relative focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isColor ? 'border-white' : 'border-transparent'}`}
                                                        style={{ backgroundColor: color }}
                                                        aria-label={`Select caption color ${color}`}
                                                        title={`Caption color ${color}`}
                                                    >
                                                        <span className="sr-only">{color}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                        <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Position</label>
                                        <div className="flex gap-2 bg-zinc-950 p-1 rounded border border-zinc-800">
                                            {(['top', 'center', 'bottom'] as const).map((pos) => (
                                                <button
                                                    key={pos}
                                                    onClick={() => handleUpdateClip(selectedClipIndex, { style: { ...activeClip?.style!, position: pos }})}
                                                    disabled={!activeClip}
                                                    className={`flex-1 py-1 text-xs rounded capitalize ${activeClip?.style?.position === pos ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}
                                                >
                                                    {pos}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Font Size ({activeClip?.style?.fontSize}px)</label>
                                        <input 
                                            type="range" 
                                            min={16} 
                                            max={72} 
                                            step={1}
                                            disabled={!activeClip}
                                            value={activeClip?.style?.fontSize || DEFAULT_CAPTION_STYLE.fontSize}
                                            onChange={(e) => handleUpdateClip(selectedClipIndex, { style: { ...activeClip?.style!, fontSize: parseInt(e.target.value, 10) }})}
                                            className="w-full"
                                            aria-label="Caption font size"
                                            title="Caption font size"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTool === 'script' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-1 text-white">Scripting</h2>
                                    <p className="text-xs text-zinc-400">Generate full scripts or scene captions.</p>
                                </div>
                                
                                {/* Scene Assistant */}
                                <div className="bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                                    <h3 className="text-sm font-medium text-cyan-300 mb-2 flex items-center"><Wand2 size={14} className="mr-1"/> Scene Writer</h3>
                                    {!activeClip && <p className="text-[10px] text-zinc-500 mb-2 italic">Select a clip to apply generated scene text.</p>}
                                    <textarea 
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white mb-2 h-16 resize-none"
                                        placeholder="Describe what's happening in this clip..."
                                        value={scenePrompt}
                                        onChange={(e) => setScenePrompt(e.target.value)}
                                        disabled={!activeClip}
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        className="w-full text-xs"
                                        onClick={handleGenerateSceneCaption}
                                        loading={isGeneratingSceneScript}
                                        disabled={!activeClip || !scenePrompt}
                                    >
                                        <Wand2 size={12} className="mr-1" /> Generate Caption Overlay
                                    </Button>
                                </div>

                                <div className="border-t border-zinc-800 my-2"></div>

                                {/* Full Script Generator */}
                                <div>
                                    <h3 className="text-sm font-medium text-zinc-300 mb-2">Idea to Script</h3>
                                    <div className="space-y-2">
                                        <textarea 
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white h-24 resize-none focus:border-cyan-500 outline-none"
                                            placeholder="e.g. A day in the life of a software engineer..."
                                            value={scriptTopic}
                                            onChange={(e) => setScriptTopic(e.target.value)}
                                        />
                                        <Button 
                                            className="w-full" 
                                            onClick={handleGenerateScript} 
                                            loading={isGeneratingScript}
                                            disabled={!scriptTopic}
                                        >
                                            <Wand2 size={16} className="mr-2" /> Generate Full Project
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTool === 'voice' && (
                            <div className="space-y-6 h-full flex flex-col">
                                <div>
                                    <h2 className="text-lg font-semibold mb-1 text-white">Voiceover</h2>
                                    <p className="text-xs text-zinc-400 mb-4">Add AI narration or upload audio.</p>
                                </div>

                                {!activeClip && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded mb-4 shrink-0">
                                        <div className="flex gap-2 text-yellow-500 items-start">
                                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                            <p className="text-xs">Select a clip in the timeline below to attach audio.</p>
                                        </div>
                                    </div>
                                )}

                                {/* AI Voice Section */}
                                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                    <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50 space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-cyan-300 border-b border-zinc-700/50 pb-2">
                                            <Wand2 size={16} />
                                            <h3 className="text-sm font-medium">AI Text-to-Speech</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Select Voice</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {VOICES.map(voice => (
                                                    <button
                                                        key={voice}
                                                        onClick={() => setSelectedVoice(voice)}
                                                        className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${selectedVoice === voice ? 'bg-cyan-600 text-white shadow-md transform scale-105' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                                                    >
                                                        {voice}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                            <label className="text-xs font-medium text-zinc-400">Script Text</label>
                                            <textarea 
                                                className="w-full flex-1 bg-zinc-950 border border-zinc-700 rounded p-3 text-sm text-white focus:border-cyan-500 outline-none resize-none leading-relaxed"
                                                placeholder="Write your script here..."
                                                value={ttsText}
                                                onChange={(e) => setTtsText(e.target.value)}
                                            />
                                        </div>

                                        <Button 
                                            onClick={handleGenerateVoiceover} 
                                            loading={isGeneratingVoice}
                                            disabled={!activeClip || !ttsText}
                                            className="w-full"
                                        >
                                            <Mic size={16} className="mr-2" /> Generate Audio
                                        </Button>
                                    </div>

                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-zinc-800"></div>
                                        <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase font-medium">OR</span>
                                        <div className="flex-grow border-t border-zinc-800"></div>
                                    </div>

                                    {/* File Upload Section */}
                                    <div className={`transition-opacity ${!activeClip ? 'opacity-50' : ''}`}>
                                        <label className="block w-full group cursor-pointer">
                                            <input type="file" accept="audio/*" className="hidden" onChange={handleVoiceUpload} disabled={!activeClip} />
                                            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-4 text-center hover:border-zinc-500 hover:bg-zinc-800/50 transition-all">
                                                <div className="bg-zinc-800 p-2 rounded-full w-fit mx-auto mb-2 group-hover:scale-110 transition-transform">
                                                    <Upload size={16} className="text-zinc-400" />
                                                </div>
                                                <p className="text-xs font-medium text-zinc-300">Upload Audio File</p>
                                                <p className="text-[10px] text-zinc-500 mt-1">MP3, WAV, AAC</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTool === 'settings' && (
                             <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-1 text-white">Configuration</h2>
                                    <p className="text-xs text-zinc-400">Project settings and format.</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 block mb-2">Aspect Ratio</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[AspectRatio.Vertical, AspectRatio.Horizontal, AspectRatio.Square].map(ratio => (
                                                <button 
                                                    key={ratio}
                                                    onClick={() => setAspectRatio(ratio)}
                                                    className={`p-2 rounded border text-xs ${project.aspectRatio === ratio ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200' : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400'}`}
                                                >
                                                    {ratio}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800 text-xs text-zinc-500 leading-relaxed">
                                        <p>Rendering happens client-side. For longer videos, export may take a few moments.</p>
                                    </div>
                                </div>
                             </div>
                        )}

                    </div>
                </div>

                {/* Main Preview Area */}
                <main className="flex-1 bg-black relative flex flex-col min-w-0">
                    <ErrorBoundary>
                        <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                            <VideoPlayer 
                                clips={project.clips}
                                aspectRatio={project.aspectRatio}
                                currentIndex={selectedClipIndex}
                                isPlaying={isPlaying}
                                isExporting={isExporting}
                                onIndexChange={setSelectedClipIndex}
                                onTogglePlay={() => setIsPlaying(!isPlaying)}
                                onExportComplete={handleExportComplete}
                                onCancelExport={handleCancelExport}
                            />
                        </div>
                    </ErrorBoundary>
                    <ErrorBoundary>
                        <Timeline 
                            clips={project.clips}
                            selectedIndex={selectedClipIndex}
                            onSelect={setSelectedClipIndex}
                            onDelete={handleDeleteClip}
                            onReorder={handleReorderClips}
                        />
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
};

const NavButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${active ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
    >
        {icon}
        <span className="text-[9px] font-medium">{label}</span>
    </button>
);

export default App;