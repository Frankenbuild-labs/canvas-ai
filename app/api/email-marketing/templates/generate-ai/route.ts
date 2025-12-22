import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/cosmic'
import OpenAI from 'openai'

// Helper function to fetch webpage content
async function fetchWebpageContent(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CosmicAI/1.0)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    // Extract text content and images from HTML
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limit content length
    
    // Extract image URLs
    const imageMatches = html.match(/<img[^>]+src="([^"]+)"/gi) || []
    const images = imageMatches
      .map(match => {
        const srcMatch = match.match(/src="([^"]+)"/)
        return srcMatch ? srcMatch[1] : null
      })
      .filter(Boolean)
      .slice(0, 10) // Limit number of images
    
    return {
      title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Webpage',
      content: textContent,
      images: images
    }
  } catch (error) {
    console.error('Error fetching webpage:', error)
    return {
      title: 'Error loading webpage',
      content: `Failed to load content from ${url}`,
      images: []
    }
  }
}

// We no longer upload media; include URLs and extracted text as prompt context instead

export async function POST(request: NextRequest) {
  try {
  const { prompt, type, context_items } = await request.json()
    
    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Prompt and type are required' },
        { status: 400 }
      )
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        // Async wrapper
        ;(async () => {
          // Send initial loading message
          controller.enqueue(
            encoder.encode('data: {"type":"status","message":"Connecting to OpenAI...","progress":10}\n\n')
          )

          try {
            let processedContext = ''

            // Process context items if provided
            if (context_items && context_items.length > 0) {
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Processing context items...","progress":20}\n\n')
              )

              const contextPromises = context_items.map(async (item: any) => {
                if (item.type === 'webpage') {
                  controller.enqueue(
                    encoder.encode('data: {"type":"status","message":"Fetching webpage content...","progress":25}\n\n')
                  )
                  const webContent = await fetchWebpageContent(item.url)
                  return `\nWebpage: ${webContent.title}\nContent: ${webContent.content}\n${webContent.images.length > 0 ? `Images found: ${webContent.images.join(', ')}` : ''}\n---\n`
                } else if (item.type === 'file') {
                  return `\nReference Media URL: ${item.url}\n---\n`
                }
                return `\nReference: ${item.url}\n---\n`
              })

              const contextResults = await Promise.all(contextPromises)
              processedContext = contextResults.join('')

              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Context analysis complete. Generating content...","progress":35}\n\n')
              )
            }

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Generating email content...","progress":40}\n\n')
            )

            // Get settings for brand guidelines and company info
            const settings = await getSettings()
            const brandGuidelines = settings?.metadata.brand_guidelines || ''
            const companyName = settings?.metadata.company_name || 'Your Company'
            const aiTone = settings?.metadata.ai_tone?.value || 'Professional'
            const primaryColor = settings?.metadata.primary_brand_color || '#3b82f6'

            const currentYear = new Date().getFullYear()

            // Build prompt instructions
            const baseInstructions = `Company: ${companyName}\nTone: ${aiTone}\nPrimary Brand Color: ${primaryColor}\nCurrent Year: ${currentYear}\n${brandGuidelines ? `Brand Guidelines: ${brandGuidelines}` : ''}\n${processedContext ? `\nContext Information:\n${processedContext}` : ''}\n`;

            let task = ''
            if (type === 'Newsletter') {
              task = `Create ONLY the HTML body content for an email newsletter template based on "${prompt}". Include header using brand color, greeting with {{first_name}}, highlights with bullets, CTA button, and footer with ${currentYear}. Use inline CSS. Do not include unsubscribe link. Return ONLY raw HTML, no backticks.`
            } else if (type === 'Welcome Email') {
              task = `Create ONLY the HTML body for a welcome email about "${prompt}". Friendly tone, {{first_name}} greeting, getting started points, CTA button, inline CSS, footer with ${currentYear}. No unsubscribe link. Return ONLY raw HTML.`
            } else {
              task = `Create ONLY the HTML body for an email (${type}) about "${prompt}". Professional header using brand colors, {{first_name}} greeting, clear main section, CTA, footer with ${currentYear}, inline CSS. No unsubscribe link. Return ONLY raw HTML.`
            }

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Processing with OpenAI...","progress":50}\n\n')
            )

            const messages = [
              { role: 'system' as const, content: 'You are a helpful email design assistant that outputs HTML suitable for email clients. Use inline CSS. Never include unsubscribe links.' },
              { role: 'user' as const, content: `${baseInstructions}\n\n${task}` }
            ]

            const completion = await openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              messages,
              temperature: 0.7,
              stream: true,
              max_tokens: 2048,
            })

            let generatedContent = ''

            for await (const part of completion) {
              const delta = part.choices?.[0]?.delta?.content
              if (delta) {
                generatedContent += delta
                controller.enqueue(
                  encoder.encode(`data: {\"type\":\"content\",\"text\":\"${delta.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, '\\n')}\",\"progress\":70}\n\n`)
                )
              }
            }

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Template generated successfully!","progress":100}\n\n')
            )

            const finalContent = generatedContent.trim()
            controller.enqueue(
              encoder.encode(`data: {\"type\":\"complete\",\"data\":{\"content\":\"${finalContent.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, '\\n')}\"}}\n\n`)
            )

            controller.close()
          } catch (error) {
            console.error('Generation error:', error)
            controller.enqueue(
              encoder.encode('data: {"type":"error","error":"Failed to generate content"}\n\n')
            )
            controller.close()
          }
        })()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
