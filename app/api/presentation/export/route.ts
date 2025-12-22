import { NextResponse } from 'next/server'
import { SlideDeckSpec } from '../../../../types/presentation'
import { renderSlidevAsset } from '@/lib/presentation/slidev/exporter'

export const runtime = 'nodejs'

interface ExportRequestBody {
  deckSpec?: SlideDeckSpec
  markdown?: string
  format?: 'pdf' | 'png'
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExportRequestBody
    const requestedFormat = body.format === 'png' ? 'png' : 'pdf'
    if (!['pdf', 'png'].includes(requestedFormat)) {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    if (!body.markdown && !body.deckSpec) {
      return NextResponse.json({ error: 'Provide markdown or deckSpec' }, { status: 400 })
    }
    const { buffer, format } = await renderSlidevAsset({
      deckSpec: body.deckSpec,
      markdown: body.markdown,
      format: requestedFormat,
    })

    const binaryBody: Uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    const contentType = format === 'pdf' ? 'application/pdf' : 'image/png'
    const arrayBuffer = binaryBody.buffer.slice(
      binaryBody.byteOffset,
      binaryBody.byteOffset + binaryBody.byteLength
    ) as ArrayBuffer
    const responseBody = new Blob([arrayBuffer], { type: contentType })

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=deck.${format}`
      }
    })
  } catch (err: any) {
    console.error('Slidev export error', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
