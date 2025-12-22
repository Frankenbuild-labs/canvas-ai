// Creative Studio Project Types
// Types for managing design/video projects with persistence

export type StudioMode = 'design' | 'video';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export interface StudioProject {
  id: string;
  user_id: string;
  name: string;
  type: StudioMode;
  scene_data: string; // CESDK scene as UBQ string (engine.scene.saveToString())
  thumbnail?: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudioSettings {
  user_id: string;
  active_tab: StudioMode;
  last_project_id?: string;
  auto_save_enabled: boolean;
  auto_save_interval: number; // milliseconds
  preferences: {
    zoom?: number;
    panels?: {
      left?: boolean;
      right?: boolean;
    };
    theme?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  type: StudioMode;
  thumbnail?: string;
  updated_at: string;
}

// Local storage keys
export const STORAGE_KEYS = {
  CURRENT_PROJECT: 'studio_current_project',
  ACTIVE_TAB: 'studio_active_tab',
  SETTINGS: 'studio_settings',
  DESIGN_SCENE: 'studio_design_scene',
  VIDEO_SCENE: 'studio_video_scene',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  PROJECTS: '/api/studio/projects',
  PROJECT: (id: string) => `/api/studio/projects/${id}`,
  SETTINGS: '/api/studio/settings',
  SAVE: '/api/studio/save',
  LOAD: '/api/studio/load',
} as const;
