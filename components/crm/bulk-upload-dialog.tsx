"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, XCircle, ArrowRight, Upload } from "lucide-react"

export type BulkLead = {
  name: string
  email: string
  company: string
  phone?: string
  position?: string
  status?: string
  value?: number | string
  source?: string
  notes?: string
  lastContact?: string
}

type BulkUploadDialogProps = {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  onImportAction: (items: BulkLead[], listName?: string) => void
}

// CSV parser that returns [headers[], rows[][]]
function parseCSVRaw(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\uFEFF/g, "")) // strip BOM
    .filter((l) => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const parseLine = (row: string): string[] => {
    const cols: string[] = []
    let cur = ""
    let inQuotes = false
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === '"') {
        if (inQuotes && row[c + 1] === '"') {
          cur += '"'; c++
        } else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cols.push(cur.trim()); cur = ""
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    return cols
  }
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

type TargetField = {
  value: string
  label: string
  icon: string
  required?: boolean
}

const TARGET_FIELDS: TargetField[] = [
  { value: "name", label: "First name", icon: "👤", required: true },
  { value: "lastname", label: "Last name", icon: "👤" },
  { value: "email", label: "Email", icon: "✉️", required: true },
  { value: "phone", label: "Phone Number", icon: "📞" },
  { value: "company", label: "company", icon: "🏢" },
  { value: "position", label: "position", icon: "💼" },
  { value: "status", label: "Status", icon: "📊" },
  { value: "value", label: "Value", icon: "💰" },
  { value: "address", label: "address", icon: "📍" },
  { value: "city", label: "city", icon: "🏙️" },
  { value: "state", label: "State", icon: "🗺️" },
]

function guessMapping(headers: string[]): Record<string, number | null> {
  const map: Record<string, number | null> = {}
  const find = (pred: (h: string) => boolean) => headers.findIndex((h) => pred(h))
  
  map.name = find((h)=>/^(first\s*)?name|firstname/i.test(h))
  map.lastname = find((h)=>/last\s*name|lastname|surname/i.test(h))
  map.email = find((h)=>/email|e-mail/i.test(h))
  map.company = find((h)=>/company|organization|org/i.test(h))
  map.phone = find((h)=>/phone|mobile|cell|tel/i.test(h))
  map.position = find((h)=>/position|title|role|job/i.test(h))
  map.status = find((h)=>/status|stage/i.test(h))
  map.value = find((h)=>/value|amount|deal|spent/i.test(h))
  map.address = find((h)=>/address|street/i.test(h))
  map.city = find((h)=>/city/i.test(h))
  map.state = find((h)=>/state|province/i.test(h))
  
  return map
}

function normalizeDate(s: string): string | undefined {
  if (!s) return undefined
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
  return undefined
}

type Step = "upload" | "map" | "confirm"

export default function BulkUploadDialog({ open, onOpenChangeAction, onImportAction }: BulkUploadDialogProps) {
  const [step, setStep] = useState<Step>("upload")
  const [fileText, setFileText] = useState("")
  const [fileName, setFileName] = useState("")
  const [createList, setCreateList] = useState(true)
  const [listName, setListName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, number | null>>({})

  const raw = useMemo(() => {
    try {
      if (!fileText.trim()) return { headers: [], rows: [] }
      const r = parseCSVRaw(fileText)
      if (r.headers.length > 0 && Object.keys(mapping).length === 0) {
        setMapping(guessMapping(r.headers))
      }
      setError(null)
      return r
    } catch (e) {
      setError("Failed to parse CSV. Check formatting.")
      return { headers: [], rows: [] }
    }
  }, [fileText])

  const mappedRows: BulkLead[] = useMemo(() => {
    const out: BulkLead[] = []
    const h = raw.headers
    for (const row of raw.rows) {
      const get = (field: string): string => {
        const idx = mapping[field]
        return idx == null || idx === -1 ? "" : (row[idx] || "")
      }
      const firstName = get('name')
      const lastName = get('lastname')
      const name = `${firstName} ${lastName}`.trim()
      const email = get('email')
      const company = get('company')
      
      if (!name && !email) continue
      
      out.push({
        name: name || email,
        email,
        company,
        phone: get('phone') || undefined,
        position: get('position') || undefined,
        status: get('status') || 'new',
        value: get('value') || undefined,
        source: 'CSV Import',
        notes: `Address: ${get('address')}, ${get('city')}, ${get('state')}`.trim(),
        lastContact: undefined,
      })
    }
    return out
  }, [raw, mapping])

  const handleFile = async (file?: File) => {
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setFileText(text)
    setStep("map")
  }

  const handleImport = () => {
    if (mappedRows.length === 0) {
      setError("No valid rows detected.")
      return
    }
    const name = createList ? listName.trim() || `Import ${new Date().toLocaleString()}` : undefined
    onImportAction(mappedRows, name)
    // reset
    setFileText("")
    setFileName("")
    setListName("")
    setCreateList(true)
    setMapping({})
    setStep("upload")
    onOpenChangeAction(false)
  }

  const handleBack = () => {
    if (step === "map") setStep("upload")
    else if (step === "confirm") setStep("map")
  }

  const handleNext = () => {
    if (step === "upload" && fileText) setStep("map")
    else if (step === "map") setStep("confirm")
  }

  const isStepValid = () => {
    if (step === "upload") return fileText.trim().length > 0
    if (step === "map") return Object.values(mapping).some(v => v !== null && v !== -1)
    return true
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChangeAction(o)
      if (!o) {
        setStep("upload")
        setFileText("")
        setFileName("")
        setMapping({})
      }
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Leads (CSV)
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {step === "upload" && "Upload your CSV file to import contacts"}
            {step === "map" && "Map your CSV columns to contact properties"}
            {step === "confirm" && "Review and confirm your import"}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="csv-file" className="cursor-pointer">
                  <div className="text-lg font-medium mb-2">Choose File</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {fileName || "Infinite AI 1125.csv"}
                  </div>
                </Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button variant="outline" onClick={() => document.getElementById('csv-file')?.click()}>
                  Choose File
                </Button>
                <Button variant="link" onClick={() => setFileText(sampleCSV)}>
                  Use sample
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <strong>Required headers:</strong> name, email, company. <strong>Optional:</strong> phone, position, status, value, source, notes, lastContact
              </div>
              {fileText && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="text-sm font-medium mb-2">Preview / Paste CSV</div>
                  <div className="bg-background border rounded p-3 max-h-40 overflow-auto font-mono text-xs">
                    {fileText.split('\n').slice(0, 5).join('\n')}
                    {fileText.split('\n').length > 5 && '\n...'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Rows detected: {raw.rows.length}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step Map */}
          {step === "map" && raw.headers.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Confirm or change how columns from your file will be mapped to contact properties
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b">
                  <div className="grid grid-cols-3 gap-4 font-medium text-sm">
                    <div>Columns in your file</div>
                    <div className="text-center"></div>
                    <div>Properties in Quo</div>
                  </div>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {raw.headers.map((header, idx) => {
                    const mappedTo = Object.entries(mapping).find(([_, val]) => val === idx)?.[0]
                    const targetField = TARGET_FIELDS.find(f => f.value === mappedTo)
                    const isMapped = mappedTo !== undefined
                    
                    return (
                      <div key={idx} className="grid grid-cols-3 gap-4 items-center px-4 py-3 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm">
                            📊
                          </div>
                          <span className="font-medium">{header}</span>
                        </div>
                        <div className="text-center">
                          <ArrowRight className="w-5 h-5 mx-auto text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={mappedTo || "unmapped"}
                            onValueChange={(value) => {
                              setMapping((m) => {
                                const newMap = { ...m }
                                // Remove this column from any previous mapping
                                Object.keys(newMap).forEach(key => {
                                  if (newMap[key] === idx) delete newMap[key]
                                })
                                // Set new mapping
                                if (value !== "unmapped") {
                                  newMap[value] = idx
                                }
                                return newMap
                              })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">-- Don't import --</SelectItem>
                              {TARGET_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  <div className="flex items-center gap-2">
                                    <span>{field.icon}</span>
                                    <span>{field.label}</span>
                                    {field.required && <span className="text-xs text-green-600">(Required)</span>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isMapped && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                ✓ {Object.values(mapping).filter(v => v !== null && v !== -1).length} columns mapped
              </div>
            </div>
          )}

          {/* Step Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={createList} onCheckedChange={(v) => setCreateList(!!v)} id="create-list" />
                <Label htmlFor="create-list" className="text-sm cursor-pointer">Create a list from this upload</Label>
              </div>
              {createList && (
                <div className="space-y-2">
                  <Label className="text-sm">List name</Label>
                  <Input
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="e.g. Conference Imports"
                  />
                </div>
              )}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="text-sm font-medium mb-2">Import Summary</div>
                <div className="space-y-1 text-sm">
                  <div>✓ <strong>{mappedRows.length}</strong> contacts ready to import</div>
                  <div>✓ <strong>{Object.values(mapping).filter(v => v !== null && v !== -1).length}</strong> fields mapped</div>
                  {createList && listName && <div>✓ Will create list: <strong>{listName}</strong></div>}
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {step !== "upload" && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setStep("upload")
              setFileText("")
              setFileName("")
              setMapping({})
              onOpenChangeAction(false)
            }}>
              Cancel
            </Button>
          </div>
          {step !== "confirm" ? (
            <Button onClick={handleNext} disabled={!isStepValid()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={mappedRows.length === 0}>
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const sampleCSV = `FirstName,LastName,Email,Phone,Amount Spent,Time,Address,City,Zip,State
Amber,Kirkland,amber.cleveland@gmail.com,13139696077,99,2025-11-25 4:53:06,9664 E Hereford Dr,Ypsilanti,48197,MI
Chijoke,Emelogu,forolinks@yahoo.com,18322590263,99,2025-11-25 4:32:41,5802 Pecos CT,Marvel,77578,TX`
