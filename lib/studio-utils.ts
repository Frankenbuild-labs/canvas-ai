// Creative Studio Project Management Utilities
// Production-ready save/load functions with error handling

import { 
  StudioProject, 
  StudioSettings, 
  StudioMode, 
  ProjectMetadata,
  STORAGE_KEYS 
} from './studio-types';

// ==================== Local Storage Functions ====================

/**
 * Save project scene to localStorage (instant backup)
 */
export function saveSceneToLocal(type: StudioMode, scene: string | Record<string, any>): boolean {
  try {
    const key = type === 'design' ? STORAGE_KEYS.DESIGN_SCENE : STORAGE_KEYS.VIDEO_SCENE;
    // If scene is already a UBQ string, store it raw for simplicity and size efficiency.
    // If it's an object (legacy), store a small wrapper to preserve backward compatibility.
    if (typeof scene === 'string') {
      localStorage.setItem(key, scene);
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          sceneData: scene,
          savedAt: new Date().toISOString(),
        })
      );
    }
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

/**
 * Load project scene from localStorage
 */
export function loadSceneFromLocal(type: StudioMode): string | Record<string, any> | null {
  try {
    const key = type === 'design' ? STORAGE_KEYS.DESIGN_SCENE : STORAGE_KEYS.VIDEO_SCENE;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    // If value looks like plain UBQ (not JSON), return as string.
    const firstChar = stored.trim()[0];
    if (firstChar !== '{' && firstChar !== '[') {
      return stored; // UBQ string stored raw
    }

    // Otherwise, try legacy JSON wrapper
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.ubq === 'string') return parsed.ubq as string;
    return parsed.sceneData || null;
  } catch (error) {
    // If JSON parse failed, it might actually be a raw UBQ string; return as-is
    try {
      const key = type === 'design' ? STORAGE_KEYS.DESIGN_SCENE : STORAGE_KEYS.VIDEO_SCENE;
      const fallback = localStorage.getItem(key);
      return fallback || null;
    } catch (e) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }
}

/**
 * Save current project ID to localStorage
 */
export function saveCurrentProjectId(projectId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, projectId);
  } catch (error) {
    console.error('Failed to save project ID:', error);
  }
}

/**
 * Get current project ID from localStorage
 */
export function getCurrentProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
  } catch (error) {
    console.error('Failed to get project ID:', error);
    return null;
  }
}

/**
 * Save active tab to localStorage
 */
export function saveActiveTab(tab: StudioMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab);
  } catch (error) {
    console.error('Failed to save active tab:', error);
  }
}

/**
 * Get active tab from localStorage
 */
export function getActiveTab(): StudioMode {
  try {
    const tab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    return (tab === 'video' ? 'video' : 'design') as StudioMode;
  } catch (error) {
    return 'design';
  }
}

/**
 * Clear all studio data from localStorage
 */
export function clearLocalStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

// ==================== Local Settings (Offline) ====================

export function saveSettingsLocal(settings: Partial<StudioSettings>): void {
  try {
    const now = new Date().toISOString();
    const existingRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const merged = {
      ...existing,
      ...settings,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to save settings locally:', error);
  }
}

export function loadSettingsLocal(): StudioSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load local settings:', error);
    return null;
  }
}

// ==================== Database API Functions ====================

/**
 * Save or update project to database
 */
export async function saveProjectToDatabase(
  project: Partial<StudioProject> & { type: StudioMode; scene_data: string }
): Promise<{ success: boolean; project?: StudioProject; error?: string }> {
  try {
    const response = await fetch('/api/studio/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const savedProject = await response.json();
    return { success: true, project: savedProject };
  } catch (error) {
    console.error('Database save failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Load project from database by ID
 */
export async function loadProjectFromDatabase(
  projectId: string
): Promise<{ success: boolean; project?: StudioProject; error?: string }> {
  try {
    const response = await fetch(`/api/studio/projects/${projectId}`);
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const project = await response.json();
    return { success: true, project };
  } catch (error) {
    console.error('Database load failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get all projects for current user
 */
export async function getAllProjects(): Promise<{
  success: boolean;
  projects?: ProjectMetadata[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/studio/projects');
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const projects = await response.json();
    return { success: true, projects };
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete project by ID
 */
export async function deleteProject(projectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/studio/projects/${projectId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Save user settings to database
 */
export async function saveSettings(
  settings: Partial<StudioSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/studio/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Load user settings from database
 */
export async function loadSettings(): Promise<{
  success: boolean;
  settings?: StudioSettings;
  error?: string;
}> {
  try {
    const response = await fetch('/api/studio/settings');
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const settings = await response.json();
    return { success: true, settings };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ==================== Utility Functions ====================

/**
 * Generate a thumbnail from CESDK scene
 */
export async function generateThumbnail(
  engine: any,
  width: number = 200,
  height: number = 150
): Promise<string | null> {
  try {
    const pages = engine.block.findByType('page');
    if (pages.length === 0) return null;

    const blob = await engine.block.export(pages[0], 'image/png', {
      targetWidth: width,
      targetHeight: height,
    });

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Debounce function for auto-save
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format time ago for display
 */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ==================== CESDK Local Projects (Simple) ====================

export interface CesdkProjectMeta {
  id: string;
  name: string;
  type: 'video';
  thumbnail?: string;
  updated_at: string; // ISO string
}

const CESDK_KEYS = {
  PROJECTS: 'cesdk_projects',
  CURRENT: 'cesdk_current_project',
  SCENE: (id: string) => `cesdk_project:${id}`,
  THUMB: (id: string) => `cesdk_project:${id}:thumb`,
} as const;

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    // Per RFC4122 v4
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const b = Array.from(buf, toHex).join('');
    return `${b.slice(0,8)}-${b.slice(8,12)}-${b.slice(12,16)}-${b.slice(16,20)}-${b.slice(20)}`;
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCesdkProjects(): CesdkProjectMeta[] {
  try {
    const raw = localStorage.getItem(CESDK_KEYS.PROJECTS);
    return raw ? (JSON.parse(raw) as CesdkProjectMeta[]) : [];
  } catch {
    return [];
  }
}

function setCesdkProjects(list: CesdkProjectMeta[]) {
  try {
    localStorage.setItem(CESDK_KEYS.PROJECTS, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to persist cesdk projects:', e);
  }
}

export function getCesdkCurrentProjectId(): string | null {
  try {
    return localStorage.getItem(CESDK_KEYS.CURRENT);
  } catch {
    return null;
  }
}

export function setCesdkCurrentProjectId(id: string) {
  try {
    localStorage.setItem(CESDK_KEYS.CURRENT, id);
  } catch (e) {
    console.error('Failed to set current cesdk project id:', e);
  }
}

export function loadCesdkProjectScene(id: string): string | null {
  try {
    return localStorage.getItem(CESDK_KEYS.SCENE(id));
  } catch {
    return null;
  }
}

export function upsertCesdkProjectLocal(params: {
  id?: string;
  name?: string;
  scene?: string;
  thumbnail?: string | null;
}): CesdkProjectMeta {
  const list = getCesdkProjects();
  const now = new Date().toISOString();
  let id = params.id || uuidv4();
  let item = list.find(p => p.id === id);
  if (!item) {
    item = { id, name: params.name || 'Untitled', type: 'video', updated_at: now };
    list.unshift(item);
  }
  if (typeof params.name === 'string') item.name = params.name || 'Untitled';
  if (params.thumbnail) item.thumbnail = params.thumbnail;
  item.updated_at = now;
  setCesdkProjects(list);

  try {
    if (typeof params.scene === 'string') {
      localStorage.setItem(CESDK_KEYS.SCENE(id), params.scene);
    }
    if (params.thumbnail) {
      localStorage.setItem(CESDK_KEYS.THUMB(id), params.thumbnail);
    }
  } catch (e) {
    console.error('Failed to persist cesdk project payload:', e);
  }
  setCesdkCurrentProjectId(id);
  return item;
}

export function getCesdkProjectThumb(id: string): string | null {
  try { return localStorage.getItem(CESDK_KEYS.THUMB(id)); } catch { return null; }
}

export function deleteCesdkProjectLocal(id: string) {
  const list = getCesdkProjects().filter(p => p.id !== id);
  setCesdkProjects(list);
  try {
    localStorage.removeItem(CESDK_KEYS.SCENE(id));
    localStorage.removeItem(CESDK_KEYS.THUMB(id));
  } catch {}
}
