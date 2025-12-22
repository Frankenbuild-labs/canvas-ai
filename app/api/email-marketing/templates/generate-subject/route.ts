import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { content, templateType } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      )
    }

    const aiPrompt = `Based on the following email content, generate a compelling email subject line that:
    - Is clear and engaging
    - Matches the tone and purpose of the email
    - Is appropriate for a ${templateType || 'professional email'}
    - Is 50 characters or less

Email content:
${content}

IMPORTANT: Return ONLY the subject line text, no quotes, no explanation, no additional text.`

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You generate concise, catchy email subject lines under 50 characters. Output only the subject text.' },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.7,
        max_tokens: 32,
      })

      const raw = completion.choices?.[0]?.message?.content ?? ''
      const cleaned = raw
        .replace(/^\s*['"`\[]?|['"`\]]?\s*$/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (!cleaned) {
        throw new Error('No subject generated')
      }

      return NextResponse.json({ success: true, subject: cleaned })
    } catch (aiError) {
      console.error('AI subject generation error:', aiError)
      
      // Fallback subject generation based on template type
      let fallbackSubject = ''
      if (templateType === 'Newsletter') {
        fallbackSubject = 'Your Monthly Newsletter Update'
      } else if (templateType === 'Welcome Email') {
        fallbackSubject = 'Welcome! Let\'s get started 🎉'
      } else if (templateType === 'Promotional') {
        fallbackSubject = 'Special Offer Just for You'
      } else {
        fallbackSubject = 'Important Update'
      }

      return NextResponse.json({ 
        success: true, 
        subject: fallbackSubject,
        fallback: true 
      })
    }

  } catch (error) {
    console.error('Error in subject generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate subject line' },
      { status: 500 }
    )
  }
}
