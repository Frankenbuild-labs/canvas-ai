"use client"

import { Button } from "@/components/ui/button"
import { X, FileText, Download, Edit, Eye, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DocumentsPanelProps {
  togglePanel: () => void
}

interface Document {
  id: string
  name: string
  type: "docx" | "xlsx" | "pptx" | "pdf"
  size: string
  createdDate: string
  path?: string
}

export default function DocumentsPanel({ togglePanel }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  const getDocumentIcon = (type: Document["type"]) => {
    switch (type) {
      case "docx":
        return <FileText className="h-4 w-4 text-blue-500" />
      case "xlsx":
        return <FileText className="h-4 w-4 text-green-500" />
      case "pptx":
        return <FileText className="h-4 w-4 text-orange-500" />
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const handleDownload = (document: Document) => {
    // Create download link for the document
    if (document.path) {
      const link = document.createElement("a")
      link.href = `/api/documents/download?file=${encodeURIComponent(document.name)}`
      link.download = document.name
      link.click()
    }
  }

  const handleEdit = (document: Document) => {
    setSelectedDocument(document)
    // Open document in editor mode
  }

  const handleView = (document: Document) => {
    setSelectedDocument(document)
    // Open document in view mode
  }

  const handleDelete = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
  }

  useEffect(() => {
    setDocuments([])
  }, [])

  return (
    <div className="w-1/2 bg-card border-l flex flex-col">
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Documents</h2>
          <Badge variant="secondary" className="text-xs">
            {documents.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {documents.length === 0 ? (
          <div className="flex-1 bg-background relative flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No documents created yet</p>
              <p className="text-xs mt-2">This container is ready for integrations</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getDocumentIcon(doc.type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{doc.size}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{doc.createdDate}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {doc.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleView(doc)}
                        title="View document"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEdit(doc)}
                        title="Edit document"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownload(doc)}
                        title="Download document"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete document"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
