import { create } from 'zustand';
import { Clip, Project, AspectRatio, ClipType, CaptionStyle } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ProjectState {
  project: Project;
  selectedClipIndex: number;
  setSelectedClipIndex: (idx: number) => void;
  addClips: (files: File[]) => void;
  addGeneratedScenes: (scenes: { visual: string; voiceover: string; estimatedDuration: number }[]) => void;
  updateClip: (index: number, updates: Partial<Clip>) => void;
  deleteClip: (index: number) => void;
  reorderClips: (from: number, to: number) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  hydrate: () => void;
  persist: () => void;
  undo: () => void;
  redo: () => void;
}

interface HistoryState {
  past: Project[];
  future: Project[];
}

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: 'Inter',
  fontSize: 32,
  color: '#ffffff',
  position: 'bottom',
  backgroundColor: 'rgba(0,0,0,0.6)'
};

const initialProject: Project = {
  id: 'proj_1',
  title: 'My Buzz Roll',
  aspectRatio: AspectRatio.Vertical,
  clips: [],
  createdAt: Date.now()
};

export const useProjectStore = create<ProjectState & HistoryState>((set, get) => ({
  project: initialProject,
  selectedClipIndex: 0,
  past: [],
  future: [],

  setSelectedClipIndex: (idx) => set({ selectedClipIndex: idx }),

  addClips: (files) => {
    const newClips: Clip[] = files.map(file => {
      const url = URL.createObjectURL(file);
      // Some browsers may not populate file.type reliably; fallback to extension check
      const lowerName = file.name.toLowerCase();
      const isVideo = file.type.startsWith('video') || /(\.mp4|\.mov|\.webm|\.mkv)$/i.test(lowerName);
      const type = isVideo ? ClipType.Video : ClipType.Image;
      return {
        id: uuidv4(),
        type,
        url,
        name: file.name,
        duration: isVideo ? 5 : 5, // will adjust duration later for real video length
        style: { ...DEFAULT_CAPTION_STYLE },
        script: '',
        thumbnail: type === ClipType.Image ? url : undefined
      };
    });
    set(state => ({
      past: [...state.past, state.project],
      project: { ...state.project, clips: [...state.project.clips, ...newClips] },
      future: [],
      selectedClipIndex: state.project.clips.length
    }));
  },

  addGeneratedScenes: (scenes) => set(state => {
    const genClips: Clip[] = scenes.map((scene, idx) => ({
      id: uuidv4(),
      type: ClipType.AI_Generated,
      url: `https://placehold.co/1080x1920/18181b/FFF?text=Scene+${idx + 1}`,
      name: `Scene ${idx + 1}`,
      duration: scene.estimatedDuration,
      script: '',
      style: { ...DEFAULT_CAPTION_STYLE }
    }));
    return {
      past: [...state.past, state.project],
      project: { ...state.project, clips: [...state.project.clips, ...genClips] },
      future: [],
      selectedClipIndex: state.project.clips.length
    };
  }),

  updateClip: (index, updates) => set(state => {
    if (index < 0 || index >= state.project.clips.length) return state;
    const clips = [...state.project.clips];
    clips[index] = { ...clips[index], ...updates };
    return {
      past: [...state.past, state.project],
      project: { ...state.project, clips },
      future: []
    };
  }),

  deleteClip: (index) => set(state => {
    const clips = [...state.project.clips];
    const removed = clips.splice(index, 1);
    if (removed[0] && removed[0].url.startsWith('blob:')) {
      try { URL.revokeObjectURL(removed[0].url); } catch (_) {}
    }
    return {
      past: [...state.past, state.project],
      project: { ...state.project, clips },
      future: [],
      selectedClipIndex: Math.max(0, Math.min(state.selectedClipIndex, clips.length - 1))
    };
  }),

  reorderClips: (from, to) => set(state => {
    const clips = [...state.project.clips];
    const [moved] = clips.splice(from, 1);
    clips.splice(to, 0, moved);
    return {
      past: [...state.past, state.project],
      project: { ...state.project, clips },
      future: [],
      selectedClipIndex: to
    };
  }),

  setAspectRatio: (ratio) => set(state => ({
    past: [...state.past, state.project],
    project: { ...state.project, aspectRatio: ratio },
    future: []
  })),

  hydrate: () => {
    try {
      const raw = localStorage.getItem('buzzroll_project');
      if (!raw) return;
      const parsed: Project = JSON.parse(raw);
      set({ project: parsed, selectedClipIndex: 0, past: [], future: [] });
    } catch (e) {
      console.warn('Failed to hydrate project', e);
    }
  },

  persist: () => {
    const { project } = get();
    try { localStorage.setItem('buzzroll_project', JSON.stringify(project)); } catch (e) { console.warn('Persist failed', e); }
  },

  undo: () => set(state => {
    if (state.past.length === 0) return state;
    const past = [...state.past];
    const previous = past.pop()!;
    return {
      past,
      future: [state.project, ...state.future],
      project: previous,
      selectedClipIndex: 0
    };
  }),

  redo: () => set(state => {
    if (state.future.length === 0) return state;
    const [next, ...rest] = state.future;
    return {
      past: [...state.past, state.project],
      future: rest,
      project: next,
      selectedClipIndex: 0
    };
  })
}));
