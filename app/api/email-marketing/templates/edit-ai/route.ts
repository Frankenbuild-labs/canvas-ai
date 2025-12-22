import { NextRequest } from 'next/server'
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

// We don't upload or transform media; pass URLs as textual context only

export async function POST(request: NextRequest) {
  try {
    const { prompt, currentContent, currentSubject, templateId, context_items } = await request.json()
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        ;(async () => {
          // Initial status
          controller.enqueue(
            encoder.encode('data: {"type":"status","message":"Starting AI content editing...","progress":10}\n\n')
          )

          try {
            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Analyzing current content...","progress":30}\n\n')
            )

            let processedContext = ''
            if (context_items && context_items.length > 0) {
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Processing context items for reference...","progress":35}\n\n')
              )

              const contextPromises = context_items.map(async (item: any) => {
                if (item.type === 'webpage') {
                  controller.enqueue(
                    encoder.encode('data: {"type":"status","message":"Analyzing webpage for style references...","progress":40}\n\n')
                  )
                  const webContent = await fetchWebpageContent(item.url)
                  return `\nStyle Reference - ${webContent.title}:\nContent: ${webContent.content}\n${webContent.images.length > 0 ? `Images found: ${webContent.images.join(', ')}` : ''}\n---\n`
                } else if (item.type === 'file') {
                  return `\nReference Media URL: ${item.url}\n---\n`
                }
                return `\nReference: ${item.url}\n---\n`
              })

              const contextResults = await Promise.all(contextPromises)
              processedContext = contextResults.join('')
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Context analysis complete. Applying improvements...","progress":45}\n\n')
              )
            }

            const settings = await getSettings()
            const brandGuidelines = settings?.metadata.brand_guidelines || ''
            const companyName = settings?.metadata.company_name || 'Your Company'
            const aiTone = settings?.metadata.ai_tone?.value || 'Professional'
            const primaryColor = settings?.metadata.primary_brand_color || '#3b82f6'
            const currentYear = new Date().getFullYear()

            const instructions = `You improve HTML email templates. Maintain structure, inline CSS, placeholders like {{first_name}}, and email client compatibility. No unsubscribe link changes.`
            const contextText = `Brand Context:\nCompany: ${companyName}\nTone: ${aiTone}\nPrimary Brand Color: ${primaryColor}\nCurrent Year: ${currentYear}\n${brandGuidelines ? `Brand Guidelines: ${brandGuidelines}` : ''}\n${processedContext ? `\nReference Context:\n${processedContext}` : ''}`

            const userMsg = `Instructions: ${prompt}\n\nCurrent HTML:\n${currentContent}\n\n${contextText}\n\nReturn ONLY improved HTML, no backticks.`

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Applying AI improvements with OpenAI...","progress":60}\n\n')
            )

            const completion = await openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: instructions },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.5,
              stream: true,
              max_tokens: 2048,
            })

            let improvedContent = ''
            for await (const part of completion) {
              const delta = part.choices?.[0]?.delta?.content
              if (delta) {
                improvedContent += delta
                controller.enqueue(
                  encoder.encode(`data: {\"type\":\"content\",\"text\":\"${delta.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, '\\n')}\",\"progress\":75}\n\n`)
                )
              }
            }

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"AI editing completed successfully!","progress":100}\n\n')
            )

            const finalContent = improvedContent.trim()
            controller.enqueue(
              encoder.encode(`data: {\"type\":\"complete\",\"data\":{\"content\":\"${finalContent.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, '\\n')}\",\"subject\":\"${(currentSubject || '').replace(/\\/g, "\\\\").replace(/"/g, '\\"')}\"}}\n\n`)
            )

            controller.close()
          } catch (error) {
            console.error('AI editing error:', error)
            controller.enqueue(
              encoder.encode('data: {"type":"error","error":"Failed to edit content"}\n\n')
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
