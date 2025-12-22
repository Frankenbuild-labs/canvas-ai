# Executive Agent Document Integration Analysis

## Executive Summary

After analyzing the current executive agent setup, I found that **the AI coder did NOT properly integrate OnlyOffice with MCP**. The current implementation is:

1. ❌ **Manual NL intent parsing** (regex-based pattern matching)
2. ❌ **Hardcoded document operations** (not extensible)
3. ❌ **No MCP wrapper** around OnlyOffice capabilities
4. ❌ **Limited to basic CRUD operations** (create, read, replace text)
5. ❌ **No semantic understanding** of document structure

**What we need:** A proper MCP server that wraps ALL OnlyOffice capabilities and exposes them as tools that agents can call naturally with semantic understanding.

**Better Alternative:** **Docling** (IBM Research) is the industry-leading solution with built-in MCP support and should be our foundation.

---

## Current Implementation Problems

### 1. Executive Agent Route (`app/api/chat/executive/route.ts`)

**Current Approach:**
```typescript
// ❌ PROBLEM: Regex-based intent detection
if (/\bopen\b.*\b(last|latest|recent)\b.*\b(doc|document|file)\b/.test(lower)) {
  // hardcoded logic
}

if (/\bcount\b.*\bword/.test(lower)) {
  // hardcoded logic
}

if (/\breplace\b.*\bparagraph\b/.test(lower)) {
  // hardcoded logic
}
```

**Issues:**
- ❌ **Brittle pattern matching** - breaks with natural language variations
- ❌ **Maintenance nightmare** - 30+ regex patterns to maintain
- ❌ **Not extensible** - adding new features requires code changes
- ❌ **No semantic understanding** - can't handle complex requests
- ❌ **Limited composability** - can't chain operations naturally

**Example Failures:**
```
User: "Can you check the word count in my latest document and if it's over 500 words, add a summary section?"
❌ Current: Would fail - can't chain operations

User: "Open the contract from last week and replace all instances of 'Company A' with 'Acme Corp'"
❌ Current: Would fail - can't identify documents by date

User: "Create a table comparing Q1 and Q2 revenue in the financial report"
❌ Current: Would fail - no table manipulation
```

### 2. OnlyOffice Integration (`lib/onlyoffice/server.ts`)

**Current Approach:**
```typescript
export function buildEditorConfig(params: BuildConfigParams) {
  // ❌ PROBLEM: Just builds config for the UI editor
  // ❌ NO programmatic API for document manipulation
  // ❌ NO MCP tools exposed
  const config = {
    documentType,
    document: { fileType, title, url, key },
    editorConfig: { mode, lang, callbackUrl, user }
  }
  return { config, token }
}
```

**Issues:**
- ❌ **UI-only integration** - no programmatic document manipulation
- ❌ **No MCP layer** - agents can't call OnlyOffice functions
- ❌ **Callback-based** - requires manual webhook handling
- ❌ **Limited API surface** - can't access advanced features
- ❌ **No batch operations** - one document at a time

### 3. Document Registry (`lib/documents/registry.ts`)

**Current Approach:**
```typescript
// ❌ PROBLEM: Simple JSON file registry
export type DocEntry = {
  id: string
  url: string
  kind: "docx" | "xlsx" | "pdf" | "pptx"
  title?: string
  createdAt: string
}
```

**Issues:**
- ❌ **No metadata** - can't search by content, author, tags
- ❌ **No versioning** - can't track document history
- ❌ **No relationships** - can't link related documents
- ❌ **No semantic search** - can't find "the contract from last week"

---

## What We Should Build: MCP-First Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Executive Agent (Gemini)                 │
│              Natural Language → MCP Tool Selection           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ MCP Protocol
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  MCP Server Orchestrator                     │
│           (Routes to appropriate document MCP servers)       │
└───┬──────────────────┬───────────────────┬──────────────────┘
    │                  │                   │
    │                  │                   │
┌───▼──────┐  ┌───────▼────────┐  ┌──────▼──────────────────┐
│ Docling  │  │  OnlyOffice    │  │  Custom Operations      │
│   MCP    │  │     MCP        │  │       MCP               │
│  Server  │  │    Server      │  │      Server             │
└───┬──────┘  └───────┬────────┘  └──────┬──────────────────┘
    │                 │                   │
┌───▼─────────────────▼───────────────────▼──────────────────┐
│              Document Storage & Processing                   │
│  • File System • Database • Vector DB • Cloud Storage       │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach?

1. ✅ **Natural Language Understanding** - Agent picks tools semantically
2. ✅ **Extensible** - Add new MCP servers without changing agent code
3. ✅ **Composable** - Chain operations naturally
4. ✅ **Standard Protocol** - MCP is becoming the industry standard
5. ✅ **Tool Discovery** - Agent can explore available capabilities
6. ✅ **Error Handling** - MCP provides structured error responses

---

## Recommended Solution: Docling + Custom MCP Servers

### Why Docling?

**Docling** is IBM Research's production-grade document processing library with **native MCP support**.

#### Key Features:

**1. Multi-Format Support**
```python
# Handles ALL major formats
✅ PDF (with advanced layout understanding)
✅ DOCX (Microsoft Word)
✅ PPTX (PowerPoint)
✅ XLSX (Excel)
✅ HTML, Markdown
✅ Images (PNG, JPEG, TIFF)
✅ Audio (WAV, MP3) with ASR
✅ Video subtitles (WebVTT)
```

**2. Advanced PDF Understanding**
- Page layout analysis
- Reading order detection
- Table structure extraction
- Code block identification
- Formula recognition
- Image classification
- OCR for scanned documents

**3. Built-in MCP Server**
```json
{
  "mcpServers": {
    "docling": {
      "command": "uvx",
      "args": ["--from=docling-mcp", "docling-mcp-server"]
    }
  }
}
```

**4. Framework Integrations**
- ✅ LangChain
- ✅ LlamaIndex
- ✅ Haystack
- ✅ Crew AI
- ✅ Pydantic AI
- ✅ smolagents

**5. Production-Ready**
- 41.2k GitHub stars
- MIT license
- Active development (daily commits)
- Linux Foundation AI & Data project
- Used by IBM, Cloudera, NVIDIA, etc.

#### Docling MCP Capabilities

```python
# Example: Natural language → Docling MCP
User: "Extract all tables from the Q4 financial report"
→ Docling MCP: convert_document(url, export_format="tables")

User: "Translate this contract to Spanish"
→ Docling MCP: translate_document(url, target_lang="es")

User: "Convert this PDF to Markdown with formulas"
→ Docling MCP: convert_document(url, format="markdown", preserve_formulas=True)

User: "What's the reading order of pages 3-5?"
→ Docling MCP: analyze_layout(url, pages=[3,4,5])

User: "Extract images and describe them with AI"
→ Docling MCP: export_figures(url, enrich=True, vlm_model="granite-docling")
```

---

## Proposed Implementation Plan

### Phase 1: Docling MCP Integration (Week 1)

**Goal:** Replace regex-based document operations with Docling MCP

**Tasks:**
1. **Install Docling MCP Server**
   ```bash
   pip install docling-mcp
   uvx --from=docling-mcp docling-mcp-server
   ```

2. **Create MCP Client in Next.js**
   ```typescript
   // lib/mcp/docling-client.ts
   import { Client } from "@modelcontextprotocol/sdk/client/index.js"
   import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

   export class DoclingMCP {
     async connect() {
       const transport = new StdioClientTransport({
         command: "uvx",
         args: ["--from=docling-mcp", "docling-mcp-server"]
       })
       await this.client.connect(transport)
     }

     async convertDocument(url: string, format: string) {
       return await this.client.callTool("convert_document", {
         url, export_format: format
       })
     }

     async extractTables(url: string) {
       return await this.client.callTool("export_tables", { url })
     }

     async analyzeLayout(url: string) {
       return await this.client.callTool("analyze_layout", { url })
     }
   }
   ```

3. **Update Executive Agent to Use MCP**
   ```typescript
   // app/api/chat/executive/route.ts
   import { DoclingMCP } from "@/lib/mcp/docling-client"

   async function handleDocumentRequest(message: string, history: any[]) {
     const docling = new DoclingMCP()
     await docling.connect()

     // Let Gemini choose which MCP tool to call
     const tools = await docling.listTools()
     
     const result = await chat.sendMessage(message, {
       tools: tools.map(t => ({
         name: t.name,
         description: t.description,
         parameters: t.inputSchema
       }))
     })

     // Execute tool calls automatically
     if (result.functionCalls) {
       for (const call of result.functionCalls) {
         const output = await docling.callTool(call.name, call.args)
         // Return structured response
       }
     }
   }
   ```

**Benefits:**
- ✅ **Semantic understanding** - Agent understands document operations
- ✅ **No regex patterns** - Natural language works out of the box
- ✅ **Extensible** - Docling adds features, we get them automatically
- ✅ **Composable** - Chain operations: extract → translate → summarize

---

### Phase 2: Custom OnlyOffice MCP Server (Week 2)

**Goal:** Wrap OnlyOffice editing capabilities in MCP for real-time collaboration

**Why Both Docling AND OnlyOffice?**
- **Docling** = Document analysis, conversion, extraction (read-heavy)
- **OnlyOffice** = Real-time editing, collaboration, formatting (write-heavy)

**Architecture:**
```typescript
// mcp-servers/onlyoffice-mcp/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new Server({
  name: "onlyoffice-mcp",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
})

// Register MCP tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "create_document",
      description: "Create a new Word document with content",
      inputSchema: z.object({
        title: z.string(),
        content: z.string(),
        template: z.enum(["blank", "professional", "academic"]).optional()
      })
    },
    {
      name: "edit_document",
      description: "Edit an existing document with natural language instructions",
      inputSchema: z.object({
        documentId: z.string(),
        instruction: z.string(),
        section: z.string().optional()
      })
    },
    {
      name: "format_document",
      description: "Apply formatting to document sections",
      inputSchema: z.object({
        documentId: z.string(),
        format: z.object({
          bold: z.boolean().optional(),
          italic: z.boolean().optional(),
          fontSize: z.number().optional(),
          color: z.string().optional(),
          alignment: z.enum(["left", "center", "right", "justify"]).optional()
        }),
        range: z.string().optional()
      })
    },
    {
      name: "insert_table",
      description: "Insert a table into the document",
      inputSchema: z.object({
        documentId: z.string(),
        rows: z.number(),
        columns: z.number(),
        data: z.array(z.array(z.string())).optional(),
        position: z.string().optional()
      })
    },
    {
      name: "insert_chart",
      description: "Insert a chart/graph into the document",
      inputSchema: z.object({
        documentId: z.string(),
        type: z.enum(["bar", "line", "pie", "scatter"]),
        data: z.object({
          labels: z.array(z.string()),
          values: z.array(z.number())
        }),
        title: z.string().optional()
      })
    },
    {
      name: "add_comment",
      description: "Add a comment to a document section",
      inputSchema: z.object({
        documentId: z.string(),
        text: z.string(),
        range: z.string().optional()
      })
    },
    {
      name: "track_changes",
      description: "Enable/disable track changes mode",
      inputSchema: z.object({
        documentId: z.string(),
        enabled: z.boolean()
      })
    },
    {
      name: "compare_documents",
      description: "Compare two document versions and show differences",
      inputSchema: z.object({
        documentId1: z.string(),
        documentId2: z.string(),
        outputFormat: z.enum(["diff", "redline", "summary"]).optional()
      })
    }
  ]
}))

// Implement tool handlers
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case "create_document":
      return await createDocumentViaOnlyOffice(args)
    
    case "edit_document":
      return await editDocumentViaOnlyOffice(args)
    
    case "format_document":
      return await formatDocumentViaOnlyOffice(args)
    
    // ... implement all handlers
  }
})
```

**OnlyOffice API Integration:**
```typescript
// lib/onlyoffice/api-client.ts
import axios from "axios"

export class OnlyOfficeAPI {
  private baseUrl = process.env.ONLYOFFICE_API_URL
  
  async executeCommand(documentKey: string, command: any) {
    return await axios.post(`${this.baseUrl}/coauthoring/CommandService.ashx`, {
      c: "command",
      key: documentKey,
      command: command
    })
  }

  async insertText(documentKey: string, text: string, position?: string) {
    return await this.executeCommand(documentKey, {
      name: "insertText",
      data: { text, position }
    })
  }

  async formatRange(documentKey: string, format: any, range: string) {
    return await this.executeCommand(documentKey, {
      name: "formatRange",
      data: { format, range }
    })
  }

  async insertTable(documentKey: string, rows: number, cols: number, data?: any[][]) {
    return await this.executeCommand(documentKey, {
      name: "insertTable",
      data: { rows, columns: cols, data }
    })
  }

  async getDocumentInfo(documentKey: string) {
    return await axios.post(`${this.baseUrl}/coauthoring/CommandService.ashx`, {
      c: "info",
      key: documentKey
    })
  }
}
```

---

### Phase 3: Semantic Document Search (Week 3)

**Goal:** Enable natural language document discovery

**Stack:**
- Vector DB (Weaviate, Pinecone, or Qdrant)
- Embeddings (OpenAI `text-embedding-3-large` or Voyage AI)
- Docling for document parsing

**Implementation:**
```typescript
// lib/documents/semantic-search.ts
import { OpenAI } from "openai"
import { WeaviateClient } from "weaviate-ts-client"

export class DocumentSearch {
  private weaviate: WeaviateClient
  private openai: OpenAI

  async indexDocument(url: string, content: string, metadata: any) {
    // Generate embedding
    const embedding = await this.openai.embeddings.create({
      model: "text-embedding-3-large",
      input: content
    })

    // Store in vector DB
    await this.weaviate.data
      .creator()
      .withClassName("Document")
      .withVector(embedding.data[0].embedding)
      .withProperties({
        url,
        title: metadata.title,
        kind: metadata.kind,
        content,
        createdAt: metadata.createdAt,
        author: metadata.author,
        tags: metadata.tags
      })
      .do()
  }

  async search(query: string, filters?: any) {
    const embedding = await this.openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query
    })

    const results = await this.weaviate.graphql
      .get()
      .withClassName("Document")
      .withNearVector({ vector: embedding.data[0].embedding })
      .withLimit(10)
      .withFields("url title kind content createdAt _additional { distance }")
      .do()

    return results
  }
}
```

**Usage:**
```typescript
// Now these work naturally:
User: "Find the contract we discussed with Acme Corp last month"
→ Semantic search: finds documents with "contract" + "Acme Corp" + date filter

User: "Show me all financial reports from Q4"
→ Semantic search: finds "financial report" + time filter

User: "What documents mention machine learning?"
→ Semantic search: finds documents with ML-related content
```

---

### Phase 4: MCP Orchestrator (Week 4)

**Goal:** Intelligent routing between multiple MCP servers

```typescript
// lib/mcp/orchestrator.ts
import { DoclingMCP } from "./docling-client"
import { OnlyOfficeMCP } from "./onlyoffice-client"
import { DocumentSearch } from "../documents/semantic-search"

export class MCPOrchestrator {
  private docling: DoclingMCP
  private onlyoffice: OnlyOfficeMCP
  private search: DocumentSearch

  async handleRequest(message: string, history: any[]) {
    // 1. Determine intent
    const intent = await this.classifyIntent(message)

    switch (intent.category) {
      case "search":
        // Use semantic search
        return await this.search.search(intent.query, intent.filters)

      case "analysis":
        // Use Docling for read-heavy operations
        return await this.docling.analyze(intent.documentUrl, intent.operation)

      case "editing":
        // Use OnlyOffice for write-heavy operations
        return await this.onlyoffice.edit(intent.documentId, intent.changes)

      case "complex":
        // Chain multiple operations
        return await this.chainOperations(intent.steps)
    }
  }

  async chainOperations(steps: any[]) {
    let context = {}
    
    for (const step of steps) {
      const result = await this.executeStep(step, context)
      context = { ...context, [step.outputKey]: result }
    }

    return context
  }
}
```

**Example Complex Request:**
```
User: "Find my latest financial report, extract the revenue table, 
      create a bar chart comparing Q1-Q4, and add it to my board 
      presentation on slide 3"

Orchestrator:
1. Semantic Search → Find "financial report" (latest)
2. Docling MCP → extract_tables(reportUrl)
3. OnlyOffice MCP → create_chart(tableData, type="bar")
4. OnlyOffice MCP → insert_to_slide(presentationId, slide=3, chart)
5. Return success + preview
```

---

## Comparison: Current vs. Proposed

| Feature | Current (Regex) | Proposed (MCP) |
|---------|----------------|----------------|
| **Natural Language** | ❌ Limited patterns | ✅ Full semantic understanding |
| **Extensibility** | ❌ Code changes required | ✅ Add MCP servers plug-and-play |
| **Composability** | ❌ Can't chain operations | ✅ Natural operation chaining |
| **Error Handling** | ❌ Generic errors | ✅ Structured MCP errors |
| **Document Formats** | ⚠️ DOCX, XLSX, PDF, PPTX only | ✅ All major formats + images + audio |
| **Advanced Features** | ❌ Basic CRUD only | ✅ Layout analysis, OCR, translation, etc. |
| **Search** | ❌ Latest only | ✅ Semantic search across all docs |
| **Collaboration** | ❌ No real-time | ✅ OnlyOffice real-time editing |
| **Maintenance** | ❌ High (regex hell) | ✅ Low (declarative tools) |
| **Industry Standard** | ❌ Custom | ✅ MCP standard |

---

## Recommended Tech Stack

### Core Document Processing
- **Docling** (IBM Research) - Document parsing, conversion, analysis
  - GitHub: https://github.com/docling-project/docling
  - Stars: 41.2k
  - License: MIT
  - MCP: Built-in

### Real-Time Editing
- **OnlyOffice** (already integrated) - Collaborative editing
  - Wrap with custom MCP server
  - Keep existing UI integration

### Vector Search
- **Weaviate** (recommended) - Vector database
  - OR **Pinecone** - Managed service
  - OR **Qdrant** - Self-hosted alternative

### Embeddings
- **OpenAI** `text-embedding-3-large` - Best quality
  - OR **Voyage AI** - Specialized for RAG
  - OR **Cohere** - Good balance

### MCP Framework
- **@modelcontextprotocol/sdk** (Anthropic) - Official MCP SDK
  - Client and server implementations
  - TypeScript native

---

## Migration Strategy

### Week 1: Docling Foundation
- [ ] Install Docling MCP server
- [ ] Create MCP client wrapper in Next.js
- [ ] Update executive agent to use Docling for analysis
- [ ] Test with existing documents

### Week 2: OnlyOffice MCP
- [ ] Build custom OnlyOffice MCP server
- [ ] Implement document editing tools
- [ ] Wrap OnlyOffice API calls
- [ ] Test real-time collaboration

### Week 3: Semantic Search
- [ ] Set up vector database
- [ ] Index existing documents
- [ ] Implement search API
- [ ] Update registry with metadata

### Week 4: Orchestration
- [ ] Build MCP orchestrator
- [ ] Implement intent classification
- [ ] Add operation chaining
- [ ] End-to-end testing

### Week 5: UI Polish
- [ ] Update document viewer to show MCP capabilities
- [ ] Add tool execution feedback
- [ ] Implement progress indicators
- [ ] User documentation

---

## Example Use Cases (After MCP)

### 1. Contract Analysis
```
User: "Review the NDA from Acme Corp and check if it has a non-compete clause"

Orchestrator:
1. Search: Find "NDA" + "Acme Corp"
2. Docling: Extract text and structure
3. LLM: Analyze for non-compete clause
4. Return: Yes/No + specific clause location
```

### 2. Financial Report Generation
```
User: "Create a Q4 financial report with revenue charts from our spreadsheet"

Orchestrator:
1. Search: Find Q4 revenue spreadsheet
2. Docling: Extract table data
3. OnlyOffice: Create new Word document
4. OnlyOffice: Insert title and headers
5. OnlyOffice: Insert chart from data
6. OnlyOffice: Format professionally
7. Return: Document URL
```

### 3. Presentation Assembly
```
User: "Build a board presentation with: exec summary from the business plan, 
      revenue chart from Q4 report, and team slide from HR deck"

Orchestrator:
1. Search: Find "business plan" document
2. Docling: Extract executive summary section
3. Search: Find "Q4 report"
4. Docling: Extract revenue data
5. Search: Find "HR deck"
6. Docling: Extract team slide
7. OnlyOffice: Create new presentation
8. OnlyOffice: Assemble slides
9. Return: Presentation URL
```

### 4. Document Comparison
```
User: "Compare the old and new vendor contracts and highlight what changed"

Orchestrator:
1. Search: Find "vendor contract" (sorted by date, limit 2)
2. Docling: Extract text from both
3. OnlyOffice: Create comparison document
4. OnlyOffice: Insert redline comparison
5. LLM: Summarize key changes
6. Return: Comparison doc + summary
```

---

## Cost Estimation

### Docling
- **Free** (MIT license)
- Self-hosted or cloud
- No per-request fees

### Vector Database
- **Weaviate**: $25-100/month (managed) or free (self-hosted)
- **Pinecone**: $70/month for 1M vectors
- **Qdrant**: Free (self-hosted)

### Embeddings
- **OpenAI**: $0.13 per 1M tokens (~$0.0001 per doc)
- **Voyage AI**: $0.12 per 1M tokens
- **Cohere**: $0.10 per 1M tokens

### OnlyOffice
- Already licensed/self-hosted
- No additional cost

**Total Estimated Cost**: $50-150/month (depending on scale)

---

## Next Steps

1. **Review this analysis** with the team
2. **Choose vector DB** (I recommend Weaviate for flexibility)
3. **Set up Docling MCP** in a test environment
4. **Build proof-of-concept** with 3-5 operations
5. **Migrate gradually** - keep current system as fallback

## Questions for Discussion

1. Do we want self-hosted (Weaviate/Qdrant) or managed (Pinecone) vector DB?
2. What's our document volume? (impacts vector DB sizing)
3. Should we support OnlyOffice plugins for custom operations?
4. Do we need document versioning/history?
5. Should we build a visual MCP tool explorer UI?

---

## Conclusion

**The current regex-based approach is a technical debt trap.** Moving to MCP with Docling as the foundation will give us:

✅ **Industry-standard architecture**  
✅ **Semantic document understanding**  
✅ **Extensible without code changes**  
✅ **Composable operations**  
✅ **Production-grade reliability**  
✅ **Future-proof** (MCP is becoming the standard)

**Docling is the best choice** because it's:
- Battle-tested (IBM Research, 41k stars)
- MCP-native (no custom wrappers needed)
- Comprehensive (all formats, advanced features)
- Free and open source (MIT license)
- Actively maintained (daily commits)

Let's build this the right way! 🚀
