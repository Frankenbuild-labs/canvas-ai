import { NextRequest, NextResponse } from 'next/server'
import { listMedia, uploadMedia, listFolders } from '@/lib/email-marketing/media-supabase'

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const folder = searchParams.get('folder') || '/'
    const action = searchParams.get('action')

    // Handle different server-side actions
    if (action === 'folders') {
      const folders = await listFolders(TEST_USER_ID)
      return NextResponse.json({
        success: true,
        folders
      })
    }

    if (action === 'stats') {
      const media = await listMedia(TEST_USER_ID)
      const stats = {
        total_files: media.length,
        total_size: media.reduce((sum, m) => sum + (m.size_bytes || 0), 0),
        total_folders: (await listFolders(TEST_USER_ID)).length,
      }
      return NextResponse.json({
        success: true,
        stats
      })
    }

    // Default: get media list
    const media = await listMedia(TEST_USER_ID, folder)
    
    return NextResponse.json({
      success: true,
      media,
      total: media.length,
    })
  } catch (error) {
    console.error('Media fetch error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch media',
        success: false 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || '/'
    const alt_text = formData.get('alt_text') as string || undefined
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', success: false },
        { status: 400 }
      )
    }

    // Server-side file validation
    const maxSize = 900 * 1024 * 1024 // 900MB in bytes (Cosmic limit)
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 900MB limit', success: false },
        { status: 400 }
      )
    }

    // Server-side MIME type validation
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'text/csv',
      // Microsoft Office
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Media
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' not supported`, success: false },
        { status: 400 }
      )
    }

    // Server-side filename validation
    const filename = file.name.toLowerCase()
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js']
    const hasDangerousExtension = dangerousExtensions.some(ext => filename.endsWith(ext))
    
    if (hasDangerousExtension) {
      return NextResponse.json(
        { error: 'File type not allowed for security reasons', success: false },
        { status: 400 }
      )
    }

    // Upload to Cosmic via server-side function
    const mediaItem = await uploadMedia(file, {
      folder,
      alt_text,
      metadata: {
        uploaded_via: 'media_library_api',
        upload_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'unknown',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      media: mediaItem
    })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload file',
        success: false 
      },
      { status: 500 }
    )
  }
}
