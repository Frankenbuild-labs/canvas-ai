import React, { useEffect, useRef, useState } from 'react';
import { Clip, AspectRatio, CaptionStyle } from '../types';
import { computeWrappedLines } from '../utils/textWrap';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';

interface VideoPlayerProps {
    clips: Clip[];
    aspectRatio: AspectRatio;
    currentIndex: number;
    isPlaying: boolean;
    isExporting: boolean;
    onIndexChange: (index: number) => void;
    onTogglePlay: () => void;
    onExportComplete?: (blob: Blob) => void;
    onCancelExport?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    clips,
    aspectRatio,
    currentIndex,
    isPlaying,
    isExporting,
    onIndexChange,
    onTogglePlay,
    onExportComplete,
    onCancelExport
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Media Elements (Persistence across renders)
    const videoElRef = useRef<HTMLVideoElement>(document.createElement('video'));
    const imageElRef = useRef<HTMLImageElement>(new Image());
    const audioElRef = useRef<HTMLAudioElement>(document.createElement('audio'));

    // State tracking
    const [progress, setProgress] = useState(0);
    const [muted, setMuted] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    
    // Refs for logic
    const currentUrlRef = useRef<string | null>(null);
    const requestRef = useRef<number>();
    const clipStartTimeRef = useRef<number>(0);
    const exportIndexRef = useRef<number>(0);
    
    // Recording Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const currentClip = clips[currentIndex];
    const updateClipStore = useProjectStore(s => s.updateClip);

    // Cover scaling preference (true = crop to fill)
    const COVER_MODE = true;

    // --- Initialization ---

    useEffect(() => {
        // Initialize Audio Context
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Setup Video Element Properties
        const vid = videoElRef.current;
        vid.playsInline = true;
        vid.crossOrigin = "anonymous";
        vid.muted = false; // We handle audio, but for canvas drawing we often let it play if strictly video
        
        // Force initial render check
        const checkReady = () => {
            if (vid.readyState >= 2) setIsVideoReady(true);
        };
        vid.addEventListener('loadeddata', checkReady);
        vid.addEventListener('canplay', checkReady);

        return () => {
            vid.removeEventListener('loadeddata', checkReady);
            vid.removeEventListener('canplay', checkReady);
            cancelAnimationFrame(requestRef.current!);
        };
    }, []);

    // --- Canvas Resizing ---

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            if (canvasRef.current && containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                if (width === 0 || height === 0) return;

                const dpr = window.devicePixelRatio || 1;
                canvasRef.current.width = width * dpr;
                canvasRef.current.height = height * dpr;
                // Trigger a redraw immediately after resize
                renderFrame();
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [aspectRatio]);

    // --- Media Loading (Separated from Render Loop) ---

    useEffect(() => {
        if (!currentClip) return;

        const vid = videoElRef.current;
        const img = imageElRef.current;
        const aud = audioElRef.current;

        // Only reload media if the URL or Type has changed
        // This prevents reloading when user types text (script updates)
        if (currentUrlRef.current !== currentClip.url) {
            currentUrlRef.current = currentClip.url;
            setIsVideoReady(false);
            setProgress(0);
            clipStartTimeRef.current = Date.now();

            if (currentClip.type === 'video' || currentClip.type === 'ai_generated') {
                vid.src = currentClip.url;
                vid.load();
                // Attempt to play immediately if global playing state is true
                if (isPlaying && !isExporting) {
                    vid.play().catch(e => console.warn("Autoplay blocked", e));
                }
            } else {
                img.src = currentClip.url;
                // Images are ready effectively immediately after load
                img.onload = () => setIsVideoReady(true);
            }
        }

        // Audio URL handling (Voiceover)
        if (aud.src !== currentClip.audioUrl) {
            aud.src = currentClip.audioUrl || '';
            if (isPlaying && !isExporting && currentClip.audioUrl) {
                aud.play().catch(() => {});
            }
        }
    }, [currentIndex, currentClip?.url, currentClip?.type, currentClip?.audioUrl]); 

    // Video metadata & thumbnail generation
    useEffect(() => {
        if (!currentClip) return;
        if (!(currentClip.type === 'video' || currentClip.type === 'ai_generated')) return;
        const vid = videoElRef.current;

        const handleLoadedMetadata = () => {
            if (vid.duration && Math.abs(vid.duration - currentClip.duration) > 0.25) {
                updateClipStore(currentIndex, { duration: vid.duration });
            }
        };

        const handleLoadedData = () => {
            setIsVideoReady(true);
            // Generate thumbnail if missing
            if (!currentClip.thumbnail && vid.videoWidth && vid.videoHeight) {
                try {
                    const thumbCanvas = document.createElement('canvas');
                    const ctx = thumbCanvas.getContext('2d');
                    const targetW = 320;
                    const aspect = vid.videoHeight > 0 ? vid.videoWidth / vid.videoHeight : 9/16;
                    const targetH = Math.round(targetW / aspect);
                    thumbCanvas.width = targetW;
                    thumbCanvas.height = targetH;
                    if (ctx) {
                        ctx.fillStyle = '#000';
                        ctx.fillRect(0,0,targetW,targetH);
                        const scale = Math.min(targetW / vid.videoWidth, targetH / vid.videoHeight);
                        const w = vid.videoWidth * scale;
                        const h = vid.videoHeight * scale;
                        const x = (targetW - w) / 2;
                        const y = (targetH - h) / 2;
                        ctx.drawImage(vid, x, y, w, h);
                        const dataUrl = thumbCanvas.toDataURL('image/png');
                        updateClipStore(currentIndex, { thumbnail: dataUrl });
                    }
                } catch (e) {
                    console.warn('Thumbnail generation failed', e);
                }
            }
            // Draw initial frame if not playing
            if (!isPlaying) {
                requestAnimationFrame(renderFrame);
            }
        };

        vid.addEventListener('loadedmetadata', handleLoadedMetadata);
        vid.addEventListener('loadeddata', handleLoadedData);
        return () => {
            vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
            vid.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [currentIndex, currentClip?.url, currentClip?.type, isPlaying]);

    // Ensure static frame is drawn when ready but paused
    useEffect(() => {
        if (currentClip && isVideoReady && !isPlaying) {
            renderFrame();
        }
    }, [isVideoReady, isPlaying, currentClip]);

    // --- Playback Control ---

    useEffect(() => {
        const vid = videoElRef.current;
        const aud = audioElRef.current;

        if (isPlaying && !isExporting) {
            // Sync video time if needed
            if (currentClip?.type === 'video' && Math.abs(vid.currentTime - (progress / 100) * currentClip.duration) > 0.5) {
                 vid.currentTime = (progress / 100) * currentClip.duration;
            }

            if (currentClip?.type === 'video') vid.play().catch(() => {});
            if (currentClip?.audioUrl) aud.play().catch(() => {});
            
            clipStartTimeRef.current = Date.now() - (progress / 100 * (currentClip?.duration || 5)) * 1000;
            requestRef.current = requestAnimationFrame(renderLoop);
        } else {
            vid.pause();
            aud.pause();
            cancelAnimationFrame(requestRef.current!);
            // Draw one static frame to ensure UI is up to date
            requestAnimationFrame(renderFrame);
        }

        return () => cancelAnimationFrame(requestRef.current!);
    }, [isPlaying, isExporting]);

    // --- Mute Control ---
    useEffect(() => {
        if (videoElRef.current) videoElRef.current.muted = muted;
        if (audioElRef.current) audioElRef.current.muted = muted;
    }, [muted]);


    // --- Drawing Logic ---

    const renderLoop = () => {
        renderFrame();
        if (isPlaying || isExporting) {
            requestRef.current = requestAnimationFrame(renderLoop);
        }
    };

    const renderFrame = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !currentClip) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Black Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Media
        if (currentClip.type === 'video' || currentClip.type === 'ai_generated') {
            const vid = videoElRef.current;
            // Draw if we have data, even if not fully readyState 4
            if (vid.readyState >= 1) {
                drawScaledMedia(ctx, vid, canvas.width, canvas.height);
            }
        } else {
            const img = imageElRef.current;
            if (img.complete && img.naturalWidth > 0) {
               drawScaledMedia(ctx, img, canvas.width, canvas.height);
            }
        }

        // Draw Captions (Live from props)
        if (currentClip.script && currentClip.style && currentClip.script.trim() !== '') {
            const { position } = currentClip.style;
            const dpr = canvas.width / canvas.getBoundingClientRect().width || 1;
            
            const x = canvas.width / 2;
            let y = canvas.height / 2;

            const safeMargin = canvas.height * 0.15;
            if (position === 'top') y = safeMargin;
            if (position === 'bottom') y = canvas.height - safeMargin;

            const maxWidth = canvas.width * 0.85;
            drawTextWithWrapping(ctx, currentClip.script, x, y, maxWidth, currentClip.style, dpr);
        }

        // Update Progress
        if (!isExporting && isPlaying) {
            let currentTime = 0;
            if (currentClip.type === 'video') {
                currentTime = videoElRef.current.currentTime;
            } else {
                currentTime = (Date.now() - clipStartTimeRef.current) / 1000;
            }
            
            const pct = Math.min(100, (currentTime / currentClip.duration) * 100);
            setProgress(pct);

             if (currentTime >= currentClip.duration) {
                handleClipEnd();
            }
        }
    };

    const drawTextWithWrapping = (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        style: CaptionStyle,
        dpr: number
    ) => {
        const { fontSize, fontFamily, color, backgroundColor } = style;
        const scaledFontSize = fontSize * dpr;
        ctx.font = `bold ${scaledFontSize}px ${fontFamily}, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const padding = 12 * dpr;
        const wrap = computeWrappedLines(text, maxWidth, t => ctx.measureText(t).width, scaledFontSize);
        const startY = y - (wrap.totalHeight / 2) + (wrap.lineHeight / 2);
        if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            const bgX = x - (wrap.maxLineWidth / 2) - padding;
            const bgY = startY - (wrap.lineHeight / 2) - padding;
            const bgW = wrap.maxLineWidth + (padding * 2);
            const bgH = wrap.totalHeight + (padding * 2) - wrap.lineHeight + (wrap.lineHeight * 0.8);
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, bgW, bgH, 8 * dpr);
            ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.lineWidth = 3 * dpr;
        ctx.lineJoin = 'round';
        wrap.lines.forEach((line, i) => {
            const lineY = startY + (i * wrap.lineHeight);
            if (!backgroundColor) {
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.strokeText(line, x, lineY);
            }
            ctx.fillText(line, x, lineY);
        });
    };

    const drawScaledMedia = (ctx: CanvasRenderingContext2D, media: HTMLVideoElement | HTMLImageElement, cWidth: number, cHeight: number) => {
        const mWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
        const mHeight = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
        if (!mWidth || !mHeight) return;

        let scale: number;
        if (COVER_MODE) {
            scale = Math.max(cWidth / mWidth, cHeight / mHeight); // cover (may crop)
        } else {
            scale = Math.min(cWidth / mWidth, cHeight / mHeight); // contain
        }
        const w = mWidth * scale;
        const h = mHeight * scale;
        const x = (cWidth - w) / 2;
        const y = (cHeight - h) / 2;
        ctx.drawImage(media, x, y, w, h);
    };

    const handleClipEnd = () => {
        if (currentIndex < clips.length - 1) {
            onIndexChange(currentIndex + 1);
        } else {
            onTogglePlay();
            onIndexChange(0);
            setProgress(0);
        }
    };

    // --- EXPORT LOGIC (Preserved) ---
    
    useEffect(() => {
        if (isExporting) {
            startExport();
        }
    }, [isExporting]);

    const startExport = async () => {
        if (!canvasRef.current || !audioCtxRef.current) return;
        
        const stream = canvasRef.current.captureStream(30); 
        const dest = audioCtxRef.current.createMediaStreamDestination();
        streamDestRef.current = dest;
        
        if (dest.stream.getAudioTracks().length > 0) {
            stream.addTrack(dest.stream.getAudioTracks()[0]);
        }

        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            if (onExportComplete) onExportComplete(blob);
        };

        recorder.start();
        await playSequenceForExport(0);
    };

    const playSequenceForExport = async (index: number) => {
        if (index >= clips.length) {
            mediaRecorderRef.current?.stop();
            return;
        }

        exportIndexRef.current = index;
        const clip = clips[index];
        const vid = videoElRef.current;
        const aud = audioElRef.current;
        const img = imageElRef.current;

        // Load Media for Export
        if (clip.type === 'video' || clip.type === 'ai_generated') {
            vid.src = clip.url;
            await new Promise((resolve) => {
                vid.onloadeddata = resolve;
                vid.load();
            });
        } else {
            img.src = clip.url;
            await new Promise((resolve) => {
                img.onload = resolve;
                setTimeout(resolve, 50); 
            });
        }

        // Setup Audio for Export
        if (clip.audioUrl) {
            aud.src = clip.audioUrl;
            const source = audioCtxRef.current!.createMediaElementSource(aud);
            source.connect(streamDestRef.current!);
            source.connect(audioCtxRef.current!.destination); 
        }

        // Play
        if (clip.type === 'video') vid.play();
        if (clip.audioUrl) aud.play();

        const startTime = Date.now();
        const durationMs = clip.duration * 1000;

        const tick = () => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
            
            const elapsed = Date.now() - startTime;
            
            // Forced Redraw for Export
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const effectiveClip = clips[exportIndexRef.current];
            
            if (canvas && ctx && effectiveClip) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                 if (effectiveClip.type === 'video' || effectiveClip.type === 'ai_generated') {
                    // Ensure video is drawn even if not perfectly synced
                    drawScaledMedia(ctx, vid, canvas.width, canvas.height);
                } else {
                    drawScaledMedia(ctx, img, canvas.width, canvas.height);
                }
                
                if (effectiveClip.script && effectiveClip.style && effectiveClip.script.trim() !== '') {
                     const dpr = canvas.width / canvas.getBoundingClientRect().width || 1;
                     const { position } = effectiveClip.style;
                     const x = canvas.width / 2;
                     const safeMargin = canvas.height * 0.15;
                     let y = canvas.height / 2;
                     if (position === 'top') y = safeMargin;
                     if (position === 'bottom') y = canvas.height - safeMargin;
                     const maxWidth = canvas.width * 0.85;
                     drawTextWithWrapping(ctx, effectiveClip.script, x, y, maxWidth, effectiveClip.style, dpr);
                }
            }

            if (elapsed < durationMs) {
                requestAnimationFrame(tick);
            } else {
                if (clip.type === 'video') vid.pause();
                if (clip.audioUrl) aud.pause();
                playSequenceForExport(index + 1);
            }
        };
        requestAnimationFrame(tick);
    };

    // Styles
    const arStyles = {
        [AspectRatio.Vertical]: "aspect-[9/16] h-full w-auto", 
        [AspectRatio.Horizontal]: "aspect-[16/9] w-full h-auto max-h-full",
        [AspectRatio.Square]: "aspect-square h-full w-auto"
    };

    if (!currentClip && !isExporting) {
        return (
            <div className={`bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500 ${arStyles[aspectRatio]} max-h-full max-w-full`}>
                <p>Add clips to start stitching</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-full h-full overflow-hidden">
             <div 
                ref={containerRef}
                className={`relative group bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl ${arStyles[aspectRatio]} max-h-full max-w-full`}
            >
                <canvas ref={canvasRef} className="w-full h-full object-contain" />

                {isExporting && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                        <p className="text-white font-bold text-lg mb-1">Rendering Video...</p>
                        <p className="text-zinc-400 text-sm mb-4">Please wait while we stitch your clips.</p>
                        {onCancelExport && (
                            <button 
                                onClick={onCancelExport} 
                                className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
                            >Cancel Export</button>
                        )}
                    </div>
                )}

                {!isExporting && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4 text-white">
                            <button onClick={() => onIndexChange(Math.max(0, currentIndex - 1))} aria-label="Previous clip" title="Previous clip">
                                <SkipBack size={20} />
                            </button>
                            <button onClick={onTogglePlay} className="bg-white text-black rounded-full p-2 hover:bg-gray-200 transition" aria-label={isPlaying ? 'Pause' : 'Play'} title={isPlaying ? 'Pause' : 'Play'}>
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button onClick={() => onIndexChange(Math.min(clips.length - 1, currentIndex + 1))} aria-label="Next clip" title="Next clip">
                                <SkipForward size={20} />
                            </button>
                            
                            <div 
                                className="flex-1 mx-4 h-1 bg-zinc-600 rounded-full overflow-hidden cursor-pointer" 
                                aria-label="Playback progress"
                            >
                                {/* stylelint-disable-next-line */}
                                <div 
                                    className="h-full bg-indigo-500 transition-all duration-100" 
                                    style={{ width: `${progress}%` }} 
                                />
                            </div>

                            <button onClick={() => setMuted(!muted)}>
                                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 text-center">
                            Clip {currentIndex + 1} of {clips.length}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};