export enum AspectRatio {
    Vertical = "9:16",
    Horizontal = "16:9",
    Square = "1:1"
}

export enum ClipType {
    Video = "video",
    Image = "image",
    AI_Generated = "ai_generated"
}

export interface CaptionStyle {
    fontFamily: string;
    fontSize: number; // in pixels
    color: string;
    backgroundColor?: string;
    position: 'top' | 'center' | 'bottom';
}

export interface Clip {
    id: string;
    type: ClipType;
    url: string; // Blob URL or remote URL
    thumbnail?: string;
    duration: number; // in seconds
    name: string;
    
    // Content features
    script?: string; // The visible text caption
    audioUrl?: string; // Voiceover blob URL
    
    // Visual Settings
    style?: CaptionStyle;
    filter?: string;
}

export interface Project {
    id: string;
    title: string;
    aspectRatio: AspectRatio;
    clips: Clip[];
    createdAt: number;
}

export interface GeneratedScript {
    title: string;
    scenes: {
        visual: string;
        voiceover: string;
        estimatedDuration: number;
    }[];
}