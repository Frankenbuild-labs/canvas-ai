#!/usr/bin/env node
/**
 * Generate thumbnails for all document templates using OnlyOffice Document Server
 * Run with: node scripts/generate-template-thumbnails.mjs
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const templatesJsonPath = path.join(projectRoot, 'public', 'templates', 'templates.json')
const thumbnailsDir = path.join(projectRoot, 'public', 'templates', 'thumbnails')

const ONLYOFFICE_URL = process.env.ONLYOFFICE_DOCSERVER_URL || 'http://localhost:8082'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

console.log('🖼️  Template Thumbnail Generator')
console.log('================================')
console.log(`OnlyOffice: ${ONLYOFFICE_URL}`)
console.log(`App URL: ${APP_URL}`)
console.log('')

// Create thumbnails directory
await fs.mkdir(thumbnailsDir, { recursive: true })

// Load templates.json
const templatesData = JSON.parse(await fs.readFile(templatesJsonPath, 'utf-8'))
const templates = templatesData.templates

console.log(`Found ${templates.length} templates`)
console.log('')

let successCount = 0
let failCount = 0
let skipCount = 0

for (const template of templates) {
  const ext = template.path.split('.').pop().toLowerCase()
  const thumbnailFileName = `${template.id}.png`
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFileName)
  
  // Check if thumbnail already exists
  try {
    await fs.access(thumbnailPath)
    console.log(`⏭️  Skipping ${template.id} (already exists)`)
    skipCount++
    continue
  } catch {
    // Thumbnail doesn't exist, generate it
  }

  console.log(`📸 Generating thumbnail for: ${template.name}`)
  
  try {
    const fileUrl = `${APP_URL}${template.path}`
    
    const conversionRequest = {
      async: false,
      filetype: ext,
      key: `thumbnail_${template.id}_${Date.now()}`,
      outputtype: 'png',
      thumbnail: {
        aspect: 1,
        first: true,
        height: 400,
        width: 300
      },
      title: template.name,
      url: fileUrl
    }

    const response = await fetch(`${ONLYOFFICE_URL}/ConvertService.ashx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conversionRequest)
    })

    if (!response.ok) {
      throw new Error(`OnlyOffice conversion failed: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.fileUrl || result.url) {
      // Fetch the generated thumbnail
      const thumbnailUrl = result.fileUrl || result.url
      const thumbnailResponse = await fetch(thumbnailUrl)
      const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer())
      
      // Save thumbnail
      await fs.writeFile(thumbnailPath, thumbnailBuffer)
      
      // Update template data with thumbnail path
      template.thumbnail = `/templates/thumbnails/${thumbnailFileName}`
      
      console.log(`✅ Generated: ${thumbnailFileName}`)
      successCount++
    } else {
      throw new Error('No thumbnail URL in response')
    }
  } catch (error) {
    console.error(`❌ Failed for ${template.id}:`, error.message)
    failCount++
  }
  
  // Add small delay to avoid overwhelming the server
  await new Promise(resolve => setTimeout(resolve, 500))
}

// Save updated templates.json with thumbnail paths
await fs.writeFile(templatesJsonPath, JSON.stringify(templatesData, null, 2))

console.log('')
console.log('================================')
console.log(`✅ Success: ${successCount}`)
console.log(`⏭️  Skipped: ${skipCount}`)
console.log(`❌ Failed: ${failCount}`)
console.log(`📁 Thumbnails saved to: ${thumbnailsDir}`)
console.log('✨ Updated templates.json with thumbnail paths')
