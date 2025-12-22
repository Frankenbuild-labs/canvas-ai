import React from 'react';
import { Platform, SearchParams } from '../types';
import { SearchIcon, ActivityIcon, GlobeIcon, TerminalIcon } from './Icons';

interface SearchConfigPanelProps {
  params: SearchParams;
  isSearching: boolean;
  onChange: (newParams: SearchParams) => void;
  onSearch: () => void;
  features: { advanced: boolean; brightdata: boolean };
}

export const SearchConfigPanel: React.FC<SearchConfigPanelProps> = ({ params, isSearching, onChange, onSearch, features }) => {
  
  const handleChange = (field: keyof SearchParams, value: any) => {
    onChange({ ...params, [field]: value });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 w-[400px] shadow-xl z-10">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <ActivityIcon className="text-accent-primary" />
          Lead Discovery Engine
        </h2>
        <p className="text-slate-400 text-sm mt-1">Configure search agents & crawlers</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Basic Criteria */}
        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Targeting Criteria</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target Role</label>
            <input 
              type="text" 
              value={params.targetRole}
              onChange={(e) => handleChange('targetRole', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. CTO, Marketing Director"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Industry / Niche</label>
            <input 
              type="text" 
              value={params.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. SaaS, Fintech, Healthcare"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
            <input 
              type="text" 
              value={params.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Keywords (Boolean Support)</label>
            <textarea 
              value={params.keywords}
              onChange={(e) => handleChange('keywords', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none h-20 resize-none transition-all"
              placeholder='"Software" AND "Manager" -Intern'
            />
          </div>
        </section>

        {/* Platform & Method */}
        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Source Intelligence</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Primary Source Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(Platform).map((p) => (
                <button
                  key={p}
                  onClick={() => handleChange('platform', p)}
                  className={`px-3 py-2 text-sm rounded-md border transition-all text-left truncate
                    ${params.platform === p 
                      ? 'bg-accent-primary/20 border-accent-primary text-accent-primary' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Target URL - Only show for General Web */}
          {params.platform === Platform.WEB && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Target Website URL (Optional)
              </label>
              <input 
                type="text" 
                value={params.targetUrl || ''}
                onChange={(e) => handleChange('targetUrl', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:ring-2 focus:ring-accent-primary outline-none transition-all"
                placeholder="e.g. example.com (searches only this domain)"
              />
              <p className="text-xs text-slate-500 mt-1">
                Leave empty to search all websites, or enter a domain to crawl specific site
              </p>
            </div>
          )}
        </section>

        {/* Lead Volume */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Lead Volume</h3>
            <span className="text-sm font-semibold text-accent-primary">{params.numResults} leads</span>
          </div>
          
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <input 
              type="range" 
              min="1" 
              max="300" 
              value={params.numResults}
              onChange={(e) => handleChange('numResults', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent-primary"
              style={{
                background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${(params.numResults / 300) * 100}%, rgb(51, 65, 85) ${(params.numResults / 300) * 100}%, rgb(51, 65, 85) 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
              <span>1</span>
              <span>50</span>
              <span>100</span>
              <span>150</span>
              <span>200</span>
              <span>250</span>
              <span>300</span>
            </div>
          </div>
        </section>

        {/* Enrichment */}
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Data Fields</h3>
          
          <div className="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-lg border border-slate-700">
            <span className="text-sm text-slate-300">Email</span>
            <button 
              onClick={() => handleChange('includeEmail', !params.includeEmail)}
              aria-label="Toggle find business email"
              className={`w-11 h-6 rounded-full transition-colors relative ${params.includeEmail ? 'bg-accent-primary' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${params.includeEmail ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-lg border border-slate-700">
            <span className="text-sm text-slate-300">Phone Number</span>
            <button 
              onClick={() => handleChange('includePhone', !params.includePhone)}
              aria-label="Toggle find phone number"
              className={`w-11 h-6 rounded-full transition-colors relative ${params.includePhone ? 'bg-accent-primary' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${params.includePhone ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-lg border border-slate-700">
            <span className="text-sm text-slate-300">Address</span>
            <button 
              onClick={() => handleChange('includeAddress', !params.includeAddress)}
              aria-label="Toggle address"
              className={`w-11 h-6 rounded-full transition-colors relative ${params.includeAddress ? 'bg-accent-primary' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${params.includeAddress ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </section>

      </div>

      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <button 
          onClick={onSearch}
          disabled={isSearching}
          className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all
            ${isSearching 
              ? 'bg-slate-700 cursor-not-allowed opacity-75' 
              : 'bg-accent-primary hover:bg-accent-secondary shadow-lg shadow-accent-primary/40 transform hover:-translate-y-0.5'}`}
        >
          {isSearching ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Running Agents...
            </>
          ) : (
            <>
              <GlobeIcon className="w-5 h-5" />
              LAUNCH EXTRACTION
            </>
          )}
        </button>
      </div>
    </div>
  );
};