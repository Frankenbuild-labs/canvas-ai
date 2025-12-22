import { NextRequest, NextResponse } from 'next/server'

interface ExaResult {
  id: string
  title: string
  url: string
  text?: string
  highlights?: string[]
  image?: string
  favicon?: string
  publishedDate?: string
  author?: string
  score?: number
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const EXA_API_KEY = process.env.EXA_API_KEY
    if (!EXA_API_KEY) {
      return NextResponse.json(
        { error: 'Search API not configured' },
        { status: 500 }
      )
    }

    // Call Exa Search API
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY
      },
      body: JSON.stringify({
        query,
        numResults: 10,
        type: 'auto',
        contents: {
          text: true,
          highlights: true,
          image: true
        },
        useAutoprompt: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Exa API error:', error)
      return NextResponse.json(
        { error: 'Search request failed' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform Exa results to our format
    const results = data.results?.map((result: any) => ({
      id: result.id || result.url,
      title: result.title || 'Untitled',
      url: result.url,
      text: result.text || result.highlights?.join(' ') || '',
      image: result.image,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}`,
      publishedDate: result.publishedDate,
      author: result.author,
      score: result.score
    })) || []

    return NextResponse.json({
      results,
      count: results.length,
      query
    })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
