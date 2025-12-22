// app/api/email-marketing/templates/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmailTemplate, createEmailTemplate } from '@/lib/cosmic'
import { EmailTemplate } from '@/lib/email-marketing/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch original via DB-backed adapter
    const originalTemplate = (await getEmailTemplate(id)) as EmailTemplate | null

    if (!originalTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create a new template name with "(Copy)" suffix
    const originalName = originalTemplate.metadata?.name || originalTemplate.title
    const copyName = `${originalName} (Copy)`

    // Create the duplicate template via DB adapter
    const duplicatedTemplate = await createEmailTemplate({
      name: copyName,
      subject: originalTemplate.metadata?.subject || '',
      content: originalTemplate.metadata?.content || '',
      template_type: originalTemplate.metadata?.template_type?.value || 'Newsletter',
      active: false,
    })

    return NextResponse.json({ 
      success: true, 
      data: duplicatedTemplate,
      message: `Template "${originalName}" duplicated successfully as "${copyName}"`
    })
  } catch (error: any) {
    console.error('Error duplicating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate template' },
      { status: 500 }
    )
  }
}