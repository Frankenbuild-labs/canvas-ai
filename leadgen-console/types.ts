export enum Platform {
  LINKEDIN = 'LinkedIn',
  TWITTER = 'Twitter/X',
  INSTAGRAM = 'Instagram',
  FACEBOOK = 'Facebook',
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube',
  REDDIT = 'Reddit',
  WEB = 'General Web'
}

export interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  location: string;
  source: Platform;
  confidenceScore: number;
  tags: string[];
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  notes?: string;
}

export interface SearchParams {
  keywords: string;
  location: string;
  platform: Platform;
  includeEmail: boolean;
  includePhone: boolean;
  includeAddress?: boolean;
  targetRole: string;
  industry: string;
  numResults: number;
  targetUrl?: string;
}

export interface ScraperLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}