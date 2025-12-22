'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmailTemplate } from '@/lib/email-marketing/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import ConfirmationModal from '@/components/email-marketing/ConfirmationModal'
import { Copy, Eye, Play, Mail } from 'lucide-react'

interface TemplatesListProps {
  templates: EmailTemplate[]
}

export default function TemplatesList({ templates }: TemplatesListProps) {
  const router = useRouter()
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState<EmailTemplate | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Ensure templates is an array
  const templatesArray = Array.isArray(templates) ? templates : []

  // Helper functions to safely access template properties
  const getTemplateName = (template: EmailTemplate) => {
    return template.metadata?.name || template.title || 'Untitled Template'
  }

  const getTemplateType = (template: EmailTemplate) => {
    return template.metadata?.template_type?.value || template.template_type || 'html'
  }

  const getTemplateActive = (template: EmailTemplate) => {
    return template.metadata?.active ?? true
  }

  const getTemplateSubject = (template: EmailTemplate) => {
    return template.metadata?.subject || template.subject || ''
  }

  const getTemplatePreview = (template: EmailTemplate) => {
    return template.metadata?.preview_html || template.preview_html || ''
  }

  const getTemplatePreviewImage = (template: EmailTemplate) => {
    return template.metadata?.preview_image_url || template.preview_image_url || null
  }

  // Handle escape key press and setup event listener
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewTemplate) {
        setPreviewTemplate(null)
      }
    }

    // Add event listener when modal is open
    if (previewTemplate) {
      document.addEventListener('keydown', handleEscapeKey)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }
  }, [previewTemplate])

  const generatePreviewContent = (template: EmailTemplate) => {
    const content = template.metadata?.content || template.content || ''
    const subject = getTemplateSubject(template)

    if (!content || !subject) {
      return { subject: 'No content', content: 'No content available' }
    }

    // Replace template variables with sample data
    let previewContent = content
    let previewSubject = subject

    previewContent = previewContent.replace(/\{\{first_name\}\}/g, 'John')
    previewContent = previewContent.replace(/\{\{last_name\}\}/g, 'Doe')
    previewSubject = previewSubject.replace(/\{\{first_name\}\}/g, 'John')
    previewSubject = previewSubject.replace(/\{\{last_name\}\}/g, 'Doe')

    return { subject: previewSubject, content: previewContent }
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    setDuplicatingId(template.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/email-marketing/templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to duplicate template')
      }

      const result = await response.json()
      const templateName = getTemplateName(template)
      setSuccess(`Template "${templateName}" duplicated successfully!`)
      
      // Force refresh to get the latest data immediately
      router.refresh()
      
      // Additional refresh after a delay to ensure the new template appears
      setTimeout(() => {
        router.refresh()
      }, 1500)

    } catch (error: any) {
      setError(error.message || 'Failed to duplicate template')
    } finally {
      setDuplicatingId(null)
      setShowDuplicateConfirm(null)
    }
  }

  const handlePreview = (e: React.MouseEvent, template: EmailTemplate) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviewTemplate(template)
  }

  const handleDuplicate = (e: React.MouseEvent, template: EmailTemplate) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDuplicateConfirm(template)
  }

  // Handle click outside modal to close
  const handleModalBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking on the backdrop (not the modal content)
    if (e.target === e.currentTarget) {
      setPreviewTemplate(null)
    }
  }

  if (templatesArray.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
        <p className="text-gray-600 mb-6">Create your first email template to get started.</p>
        <Link href="/email/templates/new" className="btn-primary">
          Create First Template
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templatesArray.map((template) => {
          const templateName = getTemplateName(template)
          const templateType = getTemplateType(template)
          const templateActive = getTemplateActive(template)
          const templateSubject = getTemplateSubject(template)
          const templatePreview = getTemplatePreview(template)
          const templatePreviewImage = getTemplatePreviewImage(template)

          return (
          <Link
            key={template.id}
            href={`/email/templates/${template.id}/edit`}
            className="card hover:shadow-lg transition-shadow relative group cursor-pointer block h-full flex flex-col"
          >
            {/* Template Card Content - Flex grow to push buttons to bottom */}
            <div className="flex-grow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{templateName}</h3>
                  <p className="text-sm text-gray-500">{templateType}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ml-3 ${
                  templateActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {templateActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Thumbnail image (SVG generator) */}
              <div className="mb-4 w-full aspect-[16/10] bg-gray-50 border border-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                {templatePreviewImage ? (
                  <img
                    src={templatePreviewImage}
                    alt={templateName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <img
                    src={`/api/email-marketing/templates/${template.id}/thumbnail`}
                    alt={templateName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>

              {templateSubject && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Subject:</p>
                  <p className="text-sm text-gray-900 font-medium line-clamp-2">{templateSubject}</p>
                </div>
              )}

              {/* Preview snippet */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Preview:</p>
                {templatePreview ? (
                  <div
                    className="prose prose-sm max-w-none line-clamp-5 text-gray-700"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: templatePreview }}
                  />
                ) : (
                  <p className="text-xs text-gray-500 italic line-clamp-3">
                    {((template.metadata?.content || template.content || '').replace(/<[^>]+>/g,' ').trim().slice(0,120) || 'No preview available')}{((template.metadata?.content || template.content || '').length > 120 ? '…' : '')}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons - Always at bottom */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto gap-1">
              <button
                onClick={(e) => handlePreview(e, template)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Preview template"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  try {
                    // Store HTML content in sessionStorage for compose page prefill
                    const content = template.metadata?.content || template.content || '';
                    const subject = getTemplateSubject(template);
                    sessionStorage.setItem('compose_prefill_html', content);
                    sessionStorage.setItem('compose_prefill_subject', subject);
                  } catch {}
                  // Navigate to compose with prefill flag
                  router.push('/email/compose?prefill=1&source=template&id=' + template.id);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors"
                title="Use this template"
              >
                <Play className="h-4 w-4" />
                <span>Use</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  // Navigate to new campaign creation with this template selected
                  router.push('/email/campaigns/new?template_id=' + template.id + '&source=template');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                title="Start campaign with this template"
              >
                <Mail className="h-4 w-4" />
                <span>Campaign</span>
              </button>
              
              <button
                onClick={(e) => handleDuplicate(e, template)}
                disabled={duplicatingId === template.id}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                title="Duplicate template"
              >
                {duplicatingId === template.id ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Duplicating...</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Duplicate</span>
                  </>
                )}
              </button>
            </div>
          </Link>
        )})}
      </div>

      {/* Duplicate Confirmation Modal */}
      {showDuplicateConfirm && (
        <ConfirmationModal
          isOpen={true}
          onOpenChange={(open: boolean) => !open && setShowDuplicateConfirm(null)}
          title="Duplicate Template"
          message={`Are you sure you want to duplicate "${showDuplicateConfirm.metadata?.name}"? A copy will be created with "(Copy)" added to the name.`}
          confirmText="Duplicate Template"
          cancelText="Cancel"
          onConfirm={() => handleDuplicateTemplate(showDuplicateConfirm)}
          isLoading={duplicatingId === showDuplicateConfirm.id}
        />
      )}

      {/* Preview Modal - Fixed overlay positioning */}
      {previewTemplate && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 m-0"
          onClick={handleModalBackdropClick}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview: {previewTemplate.metadata?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Subject: {generatePreviewContent(previewTemplate).subject}
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body {
                          margin: 0;
                          padding: 20px;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          line-height: 1.6;
                          color: #333;
                          background: #ffffff;
                        }
                        
                        /* Reset styles to prevent interference */
                        * {
                          box-sizing: border-box;
                        }
                        
                        /* Common email styles */
                        table {
                          border-collapse: collapse;
                          width: 100%;
                        }
                        
                        img {
                          max-width: 100%;
                          height: auto;
                        }
                        
                        a {
                          color: #007cba;
                          text-decoration: none;
                        }
                        
                        a:hover {
                          text-decoration: underline;
                        }
                        
                        .container {
                          max-width: 600px;
                          margin: 0 auto;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        ${generatePreviewContent(previewTemplate).content}
                      </div>
                    </body>
                  </html>
                `}
                className="w-full h-[70vh] border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Template variables are replaced with sample data in this preview
                </p>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="btn-outline"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}