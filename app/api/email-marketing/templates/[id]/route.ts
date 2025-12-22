// app/api/email-marketing/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/email-marketing/templates-supabase'

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.subject || !body.content || !body.template_type) {
      return NextResponse.json(
        { error: 'Name, subject, content, and template type are required' },
        { status: 400 }
      )
    }

    // Normalize template_type value
    let templateType = body.template_type
    if (typeof templateType === 'object' && templateType?.value) {
      templateType = templateType.value
    }

    const updated = await updateTemplate(TEST_USER_ID, id, {
      title: body.name,
      subject: body.subject,
      content: body.content,
      template_type: templateType,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await deleteTemplate(TEST_USER_ID, id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const template = await getTemplate(TEST_USER_ID, id)
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}