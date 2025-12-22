import React, { useState } from 'react';
import { Lead } from '../types';
import { TrashIcon, DownloadIcon, FilterIcon, CheckCircleIcon } from './Icons';

interface LeadTableProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  keywords?: string; // raw keywords string to render dynamic columns (max 3)
}

function extractKeywordColumns(raw?: string): string[] {
  if (!raw) return []
  // Split by comma or spaces, strip quotes and boolean operators, take top 3
  const tokens = raw
    .split(/[,\s]+/)
    .map(t => t.trim().replace(/^"|"$/g, ''))
    .filter(t => t.length && !/^(AND|OR|NOT|\-|\+)$/.test(t.toUpperCase()))
  const unique: string[] = []
  for (const t of tokens) {
    const norm = t.toLowerCase()
    if (!unique.find(u => u.toLowerCase() === norm)) unique.push(t)
    if (unique.length >= 3) break
  }
  return unique
}

export const LeadTable: React.FC<LeadTableProps> = ({ leads, onDelete, keywords }) => {
  const keywordCols = extractKeywordColumns(keywords)
  const [isExportingCRM, setIsExportingCRM] = useState(false)
  
  const exportToCSV = () => {
    const headers = ['Name', 'Title', 'Company', 'Email', 'Phone', 'Location', 'Source', 'Status'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        `"${lead.name}"`,
        `"${lead.title}"`,
        `"${lead.company}"`,
        lead.email || '',
        lead.phone || '',
        `"${lead.location}"`,
        lead.source,
        lead.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToCRM = async () => {
    if (leads.length === 0) return
    
    setIsExportingCRM(true)
    try {
      // Format leads for CRM bulk upload - match DbLead schema
      const crmLeads = leads.map(lead => ({
        name: lead.name,
        email: lead.email || 'no-email@leadgen.com', // CRM requires email, use placeholder if missing
        phone: lead.phone || null,
        company: lead.company,
        position: lead.title, // Map title to position for CRM
        status: 'new',
        value: 0,
        source: `Lead Gen - ${lead.source}`,
        notes: `Imported from Lead Gen
Platform: ${lead.source}
Location: ${lead.location}
Confidence Score: ${lead.confidenceScore}%
Tags: ${lead.tags.join(', ')}
Source URL: ${lead.id}`
      }))

      // Create a list name based on current date and source
      const listName = `Lead Gen Import - ${new Date().toLocaleDateString()}`

      const response = await fetch('/api/crm/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: crmLeads,
          listName: listName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export to CRM')
      }

      const result = await response.json()
      const message = result.list 
        ? `✅ Successfully exported ${result.created.length} leads to CRM!\n\nList: "${result.list.name}"\n\nYou can now view and manage these leads in your CRM.`
        : `✅ Successfully exported ${result.created.length} leads to CRM!`
      alert(message)
    } catch (error: any) {
      console.error('CRM export error:', error)
      alert(`❌ Failed to export to CRM: ${error.message}`)
    } finally {
      setIsExportingCRM(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-black">
      {/* Toolbar */}
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">Lead Database</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
            {leads.length} Records
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <FilterIcon className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <button 
            onClick={exportToCRM}
            disabled={leads.length === 0 || isExportingCRM}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md border border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingCRM ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Export to CRM
              </>
            )}
          </button>
          <button 
            onClick={exportToCSV}
            disabled={leads.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-md border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10 shadow-sm border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 w-48 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="py-3 px-4 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="py-3 px-4 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
              <th className="py-3 px-4 w-52 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="py-3 px-4 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</th>
              <th className="py-3 px-4 w-56 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
              {keywordCols.map((k, i) => (
                <th key={`kw-${i}`} className="py-3 px-4 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">{k}</th>
              ))}
              <th className="py-3 px-4 w-28 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
              <th className="py-3 px-4 w-32 text-xs font-semibold text-slate-500 uppercase tracking-wider">Confidence</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                      <FilterIcon className="w-8 h-8 opacity-20" />
                    </div>
                    <p>No leads found. Start a search configuration on the right.</p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-slate-900/80 transition-colors">
                  <td className="py-2 px-4 align-top text-white text-sm truncate">{lead.name}</td>
                  <td className="py-2 px-4 align-top text-slate-200 text-sm truncate">{lead.title}</td>
                  <td className="py-2 px-4 align-top text-primary-400 text-sm truncate">{lead.company}</td>
                  <td className="py-2 px-4 align-top text-slate-300 text-sm truncate">{lead.email || ''}</td>
                  <td className="py-2 px-4 align-top text-slate-300 text-sm truncate">{lead.phone || ''}</td>
                  <td className="py-2 px-4 align-top text-slate-300 text-sm truncate">{lead.address || lead.location || ''}</td>
                  {keywordCols.map((k, i) => (
                    <td key={`kwv-${lead.id}-${i}`} className="py-2 px-4 align-top text-slate-300 text-sm truncate">
                      {(() => {
                        const needle = k.toLowerCase()
                        const hay = [lead.name, lead.title, lead.company, lead.location || '', (lead as any).address || '']
                          .join(' ').toLowerCase()
                        return hay.includes(needle) ? '✓' : ''
                      })()}
                    </td>
                  ))}
                  <td className="py-4 px-6 align-top">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-950 text-primary-200 border border-primary-900">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-top">
                     <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${lead.confidenceScore > 80 ? 'bg-primary-500' : lead.confidenceScore > 50 ? 'bg-yellow-600' : 'bg-red-600'}`} 
                            style={{ width: `${lead.confidenceScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-400">{lead.confidenceScore}%</span>
                     </div>
                  </td>
                  <td className="py-4 px-6 align-top text-right">
                    <button 
                      onClick={() => onDelete(lead.id)}
                      className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Lead"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};