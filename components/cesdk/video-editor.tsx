"use client";
import React, { forwardRef, useImperativeHandle } from 'react'
import type { SaveStatus } from "../../lib/studio-types";
import { saveSceneToLocal, loadSceneFromLocal, debounce, generateThumbnail, 
  getCesdkCurrentProjectId, setCesdkCurrentProjectId, getCesdkProjects, upsertCesdkProjectLocal, loadCesdkProjectScene } from "../../lib/studio-utils";

// Local CESDK video editor component (no external iframe)
const CESDKVideoEditor = ({ 
  className,
  initialSceneData,
  onSceneChange,
  forwardedRef
}: { 
  className?: string;
  initialSceneData?: string | Record<string, any>;
  onSceneChange?: (sceneData: string) => void;
  forwardedRef?: any;
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)
  const instanceRef = React.useRef<any>(null)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [projectId, setProjectId] = React.useState<string | null>(null)
  const [projectName, setProjectName] = React.useState<string>('Untitled')

  // Expose engine reference to parent
  useImperativeHandle(forwardedRef, () => ({
    engine: instanceRef.current?.engine,
    instance: instanceRef.current,
    isReady: ready,
  }));

  // Read env vars at component level (build-time replacement by Next.js)
  // Support multiple possible variable names (historical variants) to reduce breakage.
  const licenseKey =
    process.env.NEXT_PUBLIC_CESDK_LICENSE 
    || process.env.NEXT_PUBLIC_LICENSE 
    || process.env.NEXT_PUBLIC_IMGLY_LICENSE_KEY 
    || process.env.IMGLY_LICENSE_KEY;

  React.useEffect(() => {
    let disposed = false
    let instance: any
    
    // Log for debugging
    console.log('CESDK License Key present:', !!licenseKey)
    console.log('License key value:', licenseKey ? `${licenseKey.substring(0, 10)}...` : 'NOT FOUND')
    
    if (!licenseKey) {
      console.error('No CESDK/IMG.LY license key found. Set NEXT_PUBLIC_CESDK_LICENSE (or NEXT_PUBLIC_LICENSE / NEXT_PUBLIC_IMGLY_LICENSE_KEY) in .env.local and restart dev server')
      setError('No license key configured. Check console for details.')
      return
    }
    
    ;(async () => {
      try {
        // Dynamically import SDK and CSS client-side only
        const mod: any = await import('@cesdk/cesdk-js')
        // Inject CESDK css via CDN since package does not export css directly
        const linkId = 'cesdk-css'
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link')
          link.id = linkId
          link.rel = 'stylesheet'
          // Use a version close to installed SDK to keep styles compatible
          link.href = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.60.0/styles/cesdk.css'
          document.head.appendChild(link)
        }
        // Inject custom default theme variables (user can override later via UI)
        const themeStyleId = 'cesdk-custom-theme'
        if (!document.getElementById(themeStyleId)) {
          const style = document.createElement('style')
          style.id = themeStyleId
          style.textContent = `.ubq-public {\n  --ubq-canvas: hsl(0,0%,1.57%);\n  --ubq-elevation-1: hsl(0,0%,6.57%);\n  --ubq-elevation-2: hsl(0,0%,11.57%);\n  --ubq-elevation-3: hsl(0,0%,21.57%);\n  --ubq-foreground-default: hsla(0,0%,100%,0.9);\n  --ubq-foreground-light: hsla(0,0%,100%,0.7);\n  --ubq-foreground-info: hsla(0,0%,100%,0.5);\n  --ubq-foreground-active: hsla(150.94,30.77%,40.78%,0.9);\n  --ubq-foreground-accent: hsl(0,0%,100%);\n  --ubq-foreground-danger-default: hsl(208 14% 18%);\n  --ubq-foreground-notice-default: hsla(0,0%,100%,0.9);\n  --ubq-interactive-default: hsl(0,0%,16.57%);\n  --ubq-interactive-hover: hsl(0,0%,11.57%);\n  --ubq-interactive-pressed: hsl(0,0%,4.07%);\n  --ubq-interactive-selected: hsl(0,0%,14.07%);\n  --ubq-interactive-active-default: hsl(150.94,30.77%,40.78%);\n  --ubq-interactive-active-hover: hsl(150.83,30.77%,45.88%);\n  --ubq-interactive-active-pressed: hsl(151.07,30.77%,35.69%);\n  --ubq-interactive-accent-default: hsl(162.71,30.89%,37.45%);\n  --ubq-interactive-accent-hover: hsl(162.09,30.88%,42.55%);\n  --ubq-interactive-accent-pressed: hsl(163.53,30.91%,32.35%);\n  --ubq-interactive-danger-default: hsl(346 98% 81%);\n  --ubq-interactive-danger-hover: hsl(347 100% 88%);\n  --ubq-interactive-danger-pressed: hsl(344 89% 75%);\n  --ubq-interactive-template-default: hsl(273 100% 82%);\n  --ubq-interactive-template-hover: hsl(273 100% 89%);\n  --ubq-interactive-template-pressed: hsl(273 100% 77%);\n  --ubq-interactive-group-default: hsl(0 0% 0% / 0);\n  --ubq-interactive-group-hover: hsl(208 14% 18%);\n  --ubq-interactive-group-active-default: hsl(208 13% 23%);\n  --ubq-interactive-group-active-hover: hsl(208 12% 28%);\n  --ubq-input-default: hsl(0,0%,0%);\n  --ubq-input-hover: hsl(0,0%,0%);\n  --ubq-border-default: hsla(0,0%,51.57%,0.1);\n  --ubq-stroke-contrast-1: hsla(0,0%,100%,0.15);\n  --ubq-stroke-contrast-2: hsla(0,0%,100%,0.3);\n  --ubq-stroke-contrast-3: hsl(200 11% 95% / 0.9);\n  --ubq-focus-default: hsl(248.7,15.74%,50.02%);\n  --ubq-focus-outline: hsl(0,0%,1.57%);\n  --ubq-overlay: hsl(207 18% 10% / 0.8);\n  --ubq-notice-info: hsl(0,0%,0%);\n  --ubq-notice-success: hsl(154.94,26.17%,39.42%);\n  --ubq-notice-warning: hsl(33.42,28.82%,41.84%);\n  --ubq-notice-error: hsl(341.08,21.1%,49.27%);\n  --ubq-effect-shadow: 0px 1px 2px 0px hsla(0, 0%, 0%, 0.24), 0px 0px 0px 0.5px hsla(0, 0%, 0%, 0.12);\n  --ubq-effect-focus: 0px 1px 2px 0px hsla(0, 0%, 0%, 0.24), 0px 0px 0px 0.5px hsla(0, 0%, 0%, 0.12), 0px 0px 0px 2px hsl(210 15% 15%), 0px 0px 0px 3px hsl(221 100% 80%), 0px 0px 0px 7px hsl(221 100% 80% / 0.35);\n  --ubq-progress: hsla(0,0%,100%,0.7);\n  --ubq-static-selection-frame: hsl(230, 100%, 60%);\n  --ubq-static-contrast-white: hsl(0, 0%, 100%);\n  --ubq-static-contrast-black: hsl(0, 0%, 0%);\n  --ubq-static-snapping: hsl(338, 100%, 50%);\n  --ubq-static-bleed: hsl(334, 73%, 43%);\n  --ubq-static-text-variable: hsl(274, 97%, 60%);\n  --ubq-static-card-label-background: linear-gradient(180deg, rgba(0,0,0,0) 14.46%, rgba(0,0,0,0.6) 100% );\n  --ubq-static-card-background: linear-gradient(180deg, hsla(0,0%,100%,0.08), hsla(0,0%,0%,0.08) ), hsla(0,0%,67%,0.16);\n}`
          document.head.appendChild(style)
        }
        const CreativeEditorSDK = mod.default || mod

  console.log('Creating CESDK instance with config...')
        const config: any = {
          role: 'Adopter',
          theme: 'dark',
          license: licenseKey,
          // Ensure engine can fetch assets when running from npm
          baseURL: 'https://cdn.img.ly/packages/imgly/cesdk-js/1.60.0/assets',
          ui: {
            elements: { 
              view: 'default',  // Default UI includes inspector bar (top toolbar)
              panels: {
                settings: true,  // Enable settings panel
                inspector: true  // Enable right-side inspector panel
              },
              navigation: {
                action: {
                  export: true  // Enable export functionality
                }
              },
              // Note: Inspector bar (top toolbar with Shape/Image/Crop/etc) is part of default view
              // and appears automatically when elements are selected
            },
          },
          callbacks: {
            onExport: 'download' as const,
            onUpload: 'local' as const  // Enable local upload functionality (shows "+ Add File" button)
          }
        }
        
        if (!containerRef.current) {
          console.warn('Container ref not ready')
          return
        }
        
  instance = await CreativeEditorSDK.create(containerRef.current, config)
        instanceRef.current = instance
        console.log('CESDK instance created successfully')

        const engine = instance.engine

  // Add default/demo sources BEFORE creating any default scenes
  await instance.addDefaultAssetSources()
  await instance.addDemoAssetSources({ sceneMode: 'Video' })

  // Initialize a proper video scene; this enables the timeline UI
  let sceneLoaded = false

        // Initialize/restore current project meta
        let currentId = getCesdkCurrentProjectId()
        if (!currentId) {
          // If there are existing projects, use the most recent, else create one
          const list = getCesdkProjects()
          if (list.length > 0) {
            currentId = list[0].id
          } else {
            const created = upsertCesdkProjectLocal({ name: 'Untitled' })
            currentId = created.id
          }
        }
        setProjectId(currentId)
        // Try restore name
        try {
          const meta = getCesdkProjects().find(p => p.id === currentId)
          if (meta?.name) setProjectName(meta.name)
        } catch {}

        // 1. Try to load from initialSceneData prop (highest priority)
        if (initialSceneData && (typeof initialSceneData === 'string' || Object.keys(initialSceneData).length > 0)) {
          try {
            console.log('Loading video scene from initialSceneData prop...')
            const sceneString = typeof initialSceneData === 'string' ? initialSceneData : JSON.stringify(initialSceneData)
            await engine.scene.loadFromString(sceneString)
            sceneLoaded = true
            console.log('Video scene loaded from prop')
          } catch (err) {
            console.warn('Failed to load video scene from prop:', err)
          }
        }

        // 2. Try to load current project scene if no prop data
        if (!sceneLoaded && currentId) {
          const projectScene = loadCesdkProjectScene(currentId)
          if (projectScene) {
            try {
              await engine.scene.loadFromString(projectScene)
              sceneLoaded = true
              console.log('Video scene loaded from CESDK project:', currentId)
            } catch (err) {
              console.warn('Failed to load CESDK project scene:', err)
            }
          }
        }

        // 3. Try to load from localStorage (legacy fallback) if no project data
        if (!sceneLoaded) {
          const localScene = loadSceneFromLocal('video')
          if (localScene) {
            try {
              console.log('Loading video scene from localStorage...')
              const sceneString = typeof localScene === 'string' ? localScene : JSON.stringify(localScene)
              await engine.scene.loadFromString(sceneString)
              sceneLoaded = true
              console.log('Video scene loaded from localStorage')
            } catch (err) {
              console.warn('Failed to load video scene from localStorage:', err)
            }
          }
        }

  // 4. Create default scene if nothing loaded
        if (!sceneLoaded) {
          console.log('Creating default video scene...')
          try {
            // Prefer the high-level helper which sets up a video composition
            if (typeof instance.createVideoScene === 'function') {
              await instance.createVideoScene()
              console.log('Created video scene via instance.createVideoScene()')
            } else {
              // Fallback: load an empty video scene from CDN if helper is unavailable
              await engine.scene.loadFromURL('https://cdn.img.ly/assets/demo/v1/ly.img.video/empty.scene')
              console.log('Loaded empty video scene from CDN')
            }
          } catch (e) {
            // As a last resort, ensure a scene exists
            engine.scene.create()
            console.warn('Fell back to basic scene creation')
          }
        }

        // Minor UI tweak
        engine.editor.setSettingBool?.('page/title/show', false)

        // Setup change listener for auto-save (debounced)
        const doAutosave = debounce(async () => {
          try {
            const sceneString: string = await engine.scene.saveToString()
            // Fast local backup
            saveSceneToLocal('video', sceneString)
            // Optional: bubble up to parent consumer
            onSceneChange?.(sceneString)
            // Generate thumbnail (small preview) and keep in state/localStorage
            try {
              const thumb = await generateThumbnail(engine, 160, 90)
              if (thumb) {
                // Persist into project store
                upsertCesdkProjectLocal({ id: currentId!, name: projectName, scene: sceneString, thumbnail: thumb })
              } else {
                upsertCesdkProjectLocal({ id: currentId!, name: projectName, scene: sceneString })
              }
            } catch (e) {
              console.warn('Thumbnail generation failed (autosave):', e)
              // Still persist scene without thumb
              upsertCesdkProjectLocal({ id: currentId!, name: projectName, scene: sceneString })
            }
            setSaveStatus('saved')
            setLastSaved(new Date())
          } catch (err) {
            console.error('Failed to serialize scene for auto-save:', err)
            setSaveStatus('error')
          }
        }, 1200)

        engine.editor.onStateChanged(() => {
          // Show saving/offline immediately and debounce the heavy work
          setSaveStatus(navigator.onLine ? 'saving' : 'offline')
          doAutosave()
        })

        // Manual Save via Ctrl/Cmd+S
        const keyHandler = (ev: KeyboardEvent) => {
          if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
            ev.preventDefault()
            ;(async () => {
              try {
                setSaveStatus('saving')
                const sceneString = await engine.scene.saveToString()
                saveSceneToLocal('video', sceneString)
                onSceneChange?.(sceneString)
                try {
                  const thumb = await generateThumbnail(engine, 160, 90)
                  if (thumb) {
                    upsertCesdkProjectLocal({ id: currentId!, name: projectName, scene: sceneString, thumbnail: thumb })
                  } else {
                    upsertCesdkProjectLocal({ id: currentId!, name: projectName, scene: sceneString })
                  }
                } catch (e) {
                  console.warn('Thumbnail generation failed (manual save):', e)
                  upsertCesdkProjectLocal({ id: currentId!, name: projectName, scene: sceneString })
                }
                setSaveStatus('saved')
                setLastSaved(new Date())
              } catch (e) {
                console.error('Manual save failed:', e)
                setSaveStatus('error')
              }
            })()
          }
        }
        window.addEventListener('keydown', keyHandler)

        console.log('CESDK initialized and ready')
        setReady(true)
      } catch (e: any) {
        console.error('CESDK init failed', e)
        setError(e?.message || 'Failed to load CESDK. Check console for details.')
      }
    })()
    return () => {
      disposed = true
      try { 
        if (instance) {
          console.log('Disposing CESDK instance')
          instance.dispose?.()
        }
      } catch (e) {
        console.error('Error disposing CESDK:', e)
      }
      // Cleanup event listeners
      try {
        window.removeEventListener('keydown', () => {})
      } catch {}
    }
  }, [licenseKey])

  // DnD handlers to allow dropping media items from media panel
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const jobData = e.dataTransfer.getData('job');
      if (!jobData || !instanceRef.current?.engine) return;
      const mediaItem = JSON.parse(jobData);
      const engine = instanceRef.current.engine;

      // Resolve media URL from item
      let mediaUrl = '';
      if (mediaItem.kind === 'uploaded') {
        mediaUrl = mediaItem.url;
      } else if (mediaItem.kind === 'generated' && mediaItem.output) {
        if (typeof mediaItem.output === 'string') {
          mediaUrl = mediaItem.output;
        } else if (mediaItem.output.images && mediaItem.output.images.length > 0) {
          mediaUrl = mediaItem.output.images[0].url;
        } else if (mediaItem.output.video?.url) {
          mediaUrl = mediaItem.output.video.url;
        } else if (mediaItem.output.audio_url) {
          mediaUrl = mediaItem.output.audio_url;
        } else if (mediaItem.output.url) {
          mediaUrl = mediaItem.output.url;
        }
      }
      if (!mediaUrl) {
        console.warn('No URL found for dropped media item');
        return;
      }

      // Find first page to append elements
      const pages = engine.block.findByType('page');
      const currentPage = pages[0] ?? engine.block.findByType('scene')[0];
      if (!currentPage) return;

      const mt: string = mediaItem.mediaType;
      const isAudio = mt === 'audio' || mt === 'music' || mt === 'voiceover';
      const isVideo = mt === 'video';
      const isImage = mt === 'image';

      if (isImage) {
        const imageBlock = engine.block.create('graphic');
        const imageFill = engine.block.createFill('image');
        engine.block.setString(imageFill, 'fill/image/imageFileURI', mediaUrl);
        engine.block.setFill(imageBlock, imageFill);
        // Size and center
        engine.block.setWidth(imageBlock, 640);
        engine.block.setHeightMode(imageBlock, 'Auto');
        const pageWidth = engine.block.getWidth(currentPage);
        const pageHeight = engine.block.getHeight(currentPage);
        engine.block.setPositionX(imageBlock, Math.max(0, (pageWidth - 640) / 2));
        engine.block.setPositionY(imageBlock, Math.max(0, (pageHeight - 360) / 2));
        engine.block.appendChild(currentPage, imageBlock);
        engine.block.setSelected(imageBlock, true);
      } else if (isVideo) {
        const videoBlock = engine.block.create('graphic');
        const videoFill = engine.block.createFill('video');
        engine.block.setString(videoFill, 'fill/video/fileURI', mediaUrl);
        engine.block.setFill(videoBlock, videoFill);
        engine.block.setWidth(videoBlock, 960);
        engine.block.setHeightMode(videoBlock, 'Auto');
        const pageWidth = engine.block.getWidth(currentPage);
        const pageHeight = engine.block.getHeight(currentPage);
        engine.block.setPositionX(videoBlock, Math.max(0, (pageWidth - 960) / 2));
        engine.block.setPositionY(videoBlock, Math.max(0, (pageHeight - 540) / 2));
        engine.block.appendChild(currentPage, videoBlock);
        engine.block.setSelected(videoBlock, true);
      } else if (isAudio) {
        try {
          // Try to create an audio block if supported by engine
          const audioBlock = engine.block.create('audio');
          engine.block.setString(audioBlock, 'audio/fileURI', mediaUrl);
          // Append audio to scene root (timeline)
          const scene = engine.scene.get();
          engine.block.appendChild(scene, audioBlock);
          engine.block.setSelected(audioBlock, true);
        } catch (err) {
          console.warn('Audio drop not supported by current engine version. URL:', mediaUrl, err);
        }
      } else {
        console.warn('Unsupported dropped media type:', mt);
      }
    } catch (err) {
      console.error('Error handling drop on video editor:', err);
    }
  };

  return (
    <div className={className || 'w-full h-full bg-black relative'} onDragOver={handleDragOver} onDrop={handleDrop}>
      {error ? (
        <div className="h-full w-full grid place-items-center text-sm text-red-400 p-6 text-center">
          <div>
            <p className="mb-2 font-semibold">CESDK failed to initialize</p>
            <code className="opacity-80 text-xs block my-2">{error}</code>
            <p className="mt-3 text-xs opacity-60">Check browser console for detailed error logs.</p>
            <p className="mt-2 text-xs opacity-60">Ensure license key is set in .env.local and dev server was restarted.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Simple header above editor for project renaming */}
          <div className="w-full flex items-center justify-between px-3 py-2 border-b border-border bg-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Project:</span>
              <input
                className="bg-transparent border-0 outline-none text-sm text-white/90 px-1 py-0.5 rounded focus:ring-1 focus:ring-white/20"
                value={projectName}
                aria-label="Project name"
                title="Project name"
                placeholder="Untitled"
                onChange={(e) => {
                  const name = e.target.value
                  setProjectName(name)
                  // Debounce name persist lightly
                  const id = projectId || getCesdkCurrentProjectId()
                  if (id) {
                    upsertCesdkProjectLocal({ id, name })
                  }
                }}
                onBlur={(e) => {
                  const name = e.target.value.trim() || 'Untitled'
                  setProjectName(name)
                  const id = projectId || getCesdkCurrentProjectId()
                  if (id) upsertCesdkProjectLocal({ id, name })
                }}
              />
            </div>
            <div className="text-[11px] text-white/60">
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' && lastSaved ? `Saved ${timeAgo(lastSaved)}` : ''}
            </div>
          </div>
          <div ref={containerRef} className="w-full h-[calc(100%-36px)]" />
        </>
      )}
    </div>
  )
};

export default CESDKVideoEditor;

// Small helper for relative time display
function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}
