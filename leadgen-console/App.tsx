import React, { useState, useRef, useEffect } from 'react';
import { LeadTable } from './components/LeadTable';
import { SearchConfigPanel } from './components/SearchConfigPanel';
import { TerminalLog } from './components/TerminalLog';
import { Lead, SearchParams, Platform, ScraperLog } from './types';
import { startLeadExtraction, subscribeToLeadStream, generateLeads, fetchLeadgenFeatures, type LeadgenFeatures } from './services/geminiService';
import { DatabaseIcon } from './components/Icons';

const DEFAULT_PARAMS: SearchParams = {
  keywords: 'Marketing Managers',
  location: 'New York, NY',
  platform: Platform.LINKEDIN,
  includeEmail: true,
  includePhone: true,
  includeAddress: true,
  targetRole: 'Marketing Manager',
  industry: 'Technology',
  numResults: 25,
  targetUrl: ''
};

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_PARAMS);
  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [features, setFeatures] = useState<LeadgenFeatures>({ advanced: false, brightdata: false })

  // Helper to add logs
  const addLog = (message: string, type: ScraperLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const handleSearch = async () => {
    if (isSearching) return;
    setIsSearching(true);
    setLogs([]);
    addLog(`Starting lead extraction pipeline...`)
    try {
      const sessionId = await startLeadExtraction(searchParams)
      addLog(`Session ${sessionId} created. Connecting stream...`)
      const unsubscribe = subscribeToLeadStream(sessionId, {
        onLeads: (incoming) => {
          setLeads(prev => [...incoming, ...prev])
          addLog(`Received batch (${incoming.length}) leads`, 'info')
        },
        onStatus: (status) => {
          addLog(`Session status: ${status}`, status === 'completed' ? 'success' : 'info')
          if (status === 'completed' || status === 'error') {
            setIsSearching(false)
          }
        },
        onError: (msg) => {
          addLog(msg, 'error')
          setIsSearching(false)
        }
      })
      // Auto cleanup if component unmounts before completion
      // (Simplified: rely on unmount effect)
    } catch (e) {
      addLog(`Failed to start extraction: ${(e as Error).message}`, 'error')
      setIsSearching(false)
    }
  }

  const handleDeleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  // Load feature flags on mount
  useEffect(() => {
    fetchLeadgenFeatures()
      .then(setFeatures)
      .catch(() => setFeatures({ advanced: false, brightdata: false }))
  }, [])

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden">
      
      {/* Left Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Lead Data Grid */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <LeadTable leads={leads} onDelete={handleDeleteLead} keywords={searchParams.keywords} />
          
          {/* Terminal / Log Overlay at bottom */}
          <div className="h-64 shrink-0 border-t border-slate-800 bg-slate-950 p-4">
             <TerminalLog logs={logs} />
          </div>
        </div>
      </div>

      {/* Right Config Sidebar */}
      <div className="w-[400px] shrink-0 h-full border-l border-slate-800 shadow-2xl z-20">
        <SearchConfigPanel 
          params={searchParams}
          isSearching={isSearching}
          onChange={setSearchParams}
          onSearch={handleSearch}
          features={features}
        />
      </div>

    </div>
  );
}

export default App;