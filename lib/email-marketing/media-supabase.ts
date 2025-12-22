// Email Media Supabase Client
// Database operations for email media using Supabase Storage

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_BUCKET = 'email-media';

export interface EmailMedia {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  storage_path: string;
  storage_bucket: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  folder: string;
  alt_text: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface UploadMediaOptions {
  file: File | Buffer;
  filename: string;
  folder?: string;
  alt_text?: string;
  metadata?: any;
}

/**
 * List media files for a user
 */
export async function listMedia(
  userId: string,
  options: {
    folder?: string;
    limit?: number;
    skip?: number;
    search?: string;
  } = {}
): Promise<{ media: EmailMedia[]; total: number }> {
  try {
    const { folder = '/', limit = 100, skip = 0, search } = options;

    let query = supabase
      .from('email_media')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (folder) {
      query = query.eq('folder', folder);
    }

    if (search) {
      query = query.or(`filename.ilike.%${search}%,original_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing media:', error);
      throw error;
    }

    return {
      media: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error in listMedia:', error);
    throw error;
  }
}

/**
 * Get a single media file
 */
export async function getMedia(userId: string, mediaId: string): Promise<EmailMedia | null> {
  try {
    const { data, error } = await supabase
      .from('email_media')
      .select('*')
      .eq('id', mediaId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error getting media:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getMedia:', error);
    throw error;
  }
}

/**
 * Upload a media file to Supabase Storage
 */
export async function uploadMedia(
  userId: string,
  options: UploadMediaOptions
): Promise<EmailMedia> {
  try {
    const { file, filename, folder = '/', alt_text, metadata = {} } = options;

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/${folder}/${timestamp}-${sanitizedFilename}`;

    // Upload to Supabase Storage
    let fileBuffer: Buffer;
    let mimeType: string;
    let fileSize: number;

    if (file instanceof Buffer) {
      fileBuffer = file;
      mimeType = metadata.contentType || 'application/octet-stream';
      fileSize = file.length;
    } else {
      // File object
      fileBuffer = Buffer.from(await file.arrayBuffer());
      mimeType = file.type;
      fileSize = file.size;
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Get image dimensions if it's an image
    let width: number | null = null;
    let height: number | null = null;
    if (mimeType.startsWith('image/')) {
      try {
        const dimensions = await getImageDimensions(fileBuffer);
        width = dimensions.width;
        height = dimensions.height;
      } catch (err) {
        console.warn('Could not get image dimensions:', err);
      }
    }

    // Save metadata to database
    const { data: mediaRecord, error: dbError } = await supabase
      .from('email_media')
      .insert({
        user_id: userId,
        filename: sanitizedFilename,
        original_name: filename,
        storage_path: storagePath,
        storage_bucket: STORAGE_BUCKET,
        url: publicUrl,
        mime_type: mimeType,
        size_bytes: fileSize,
        width,
        height,
        folder: folder || '/',
        alt_text: alt_text || null,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving media metadata:', dbError);
      // Try to clean up storage if database insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw dbError;
    }

    return mediaRecord;
  } catch (error) {
    console.error('Error in uploadMedia:', error);
    throw error;
  }
}

/**
 * Delete a media file
 */
export async function deleteMedia(userId: string, mediaId: string): Promise<void> {
  try {
    // Get media record
    const media = await getMedia(userId, mediaId);
    if (!media) {
      throw new Error('Media not found');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([media.storage_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue anyway to remove database record
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('email_media')
      .delete()
      .eq('id', mediaId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Error deleting media record:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in deleteMedia:', error);
    throw error;
  }
}

/**
 * Update media metadata
 */
export async function updateMedia(
  userId: string,
  mediaId: string,
  updates: {
    filename?: string;
    folder?: string;
    alt_text?: string;
    metadata?: any;
  }
): Promise<EmailMedia> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.filename !== undefined) updateData.filename = updates.filename;
    if (updates.folder !== undefined) updateData.folder = updates.folder;
    if (updates.alt_text !== undefined) updateData.alt_text = updates.alt_text;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('email_media')
      .update(updateData)
      .eq('id', mediaId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating media:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateMedia:', error);
    throw error;
  }
}

/**
 * Get folders for a user
 */
export async function listFolders(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('email_media')
      .select('folder')
      .eq('user_id', userId);

    if (error) {
      console.error('Error listing folders:', error);
      throw error;
    }

    // Get unique folders
    const folders = new Set<string>();
    data?.forEach(item => {
      if (item.folder) folders.add(item.folder);
    });

    return Array.from(folders).sort();
  } catch (error) {
    console.error('Error in listFolders:', error);
    throw error;
  }
}

/**
 * Helper to get image dimensions (basic implementation)
 */
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  // This is a basic implementation. For production, consider using a library like 'sharp' or 'image-size'
  // For now, return null dimensions and let the client handle it
  return { width: 0, height: 0 };
}

/**
 * Ensure storage bucket exists
 */
export async function ensureStorageBucket(): Promise<void> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.log('Email media bucket does not exist. Please create it in Supabase Dashboard.');
      console.log('Run this SQL in Supabase SQL Editor:');
      console.log(`
INSERT INTO storage.buckets (id, name, public)
VALUES ('${STORAGE_BUCKET}', '${STORAGE_BUCKET}', true)
ON CONFLICT (id) DO NOTHING;
      `);
    }
  } catch (error) {
    console.error('Error ensuring storage bucket:', error);
  }
}
