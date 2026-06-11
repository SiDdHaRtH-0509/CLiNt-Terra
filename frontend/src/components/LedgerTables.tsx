'use client';

import React, { useState } from 'react';
import { Database, Filter, Search, Trash2, ArrowUpDown, Smartphone, MapPin, Zap } from 'lucide-react';
import { LedgerEntry } from '@/lib/carbon';

interface LedgerTablesProps {
  ledger: LedgerEntry[];
  onClear: () => void;
}

export default function LedgerTables({ ledger, onClear }: LedgerTablesProps) {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'carbon'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort the ledger entries
  const filteredLedger = ledger
    .filter(entry => {
      const matchSearch = 
        entry.title.toLowerCase().includes(search.toLowerCase()) || 
        entry.reasoning.toLowerCase().includes(search.toLowerCase()) ||
        entry.category.toLowerCase().includes(search.toLowerCase());
      const matchSource = filterSource === 'all' || entry.source === filterSource;
      return matchSearch && matchSource;
    })
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      } else {
        return sortOrder === 'desc' ? b.carbonFootprint - a.carbonFootprint : a.carbonFootprint - b.carbonFootprint;
      }
    });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'plaid':
        return <Smartphone className="w-3.5 h-3.5 text-[var(--neon-blue)]" />;
      case 'maps':
        return <MapPin className="w-3.5 h-3.5 text-[var(--neon-yellow)]" />;
      case 'homeassistant':
        return <Zap className="w-3.5 h-3.5 text-[var(--neon-green)]" />;
      default:
        return <Database className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'plaid': return 'Plaid Fin';
      case 'maps': return 'Transit';
      case 'homeassistant': return 'Energy';
      default: return 'Other';
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'plaid': return 'bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] border-[var(--neon-blue)]/20';
      case 'maps': return 'bg-[var(--neon-yellow)]/10 text-[var(--neon-yellow)] border-[var(--neon-yellow)]/20';
      case 'homeassistant': return 'bg-[var(--neon-green)]/10 text-[var(--neon-green)] border-[var(--neon-green)]/20';
      default: return 'bg-neutral-850 text-neutral-400 border-neutral-800';
    }
  };

  const toggleSort = (field: 'timestamp' | 'carbon') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="glass-panel p-6 w-full flex flex-col h-full gap-5">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-neutral-400" />
            Financial-Grade Carbon Ledger
          </h2>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            Immutable time-series records representing logged telemetry events
          </p>
        </div>
        
        {/* Actions */}
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-xs font-mono text-[var(--neon-orange)] hover:text-[var(--neon-orange-mid)] border border-[var(--neon-orange)]/20 hover:border-[var(--neon-orange)]/40 bg-[var(--neon-orange)]/5 hover:bg-[var(--neon-orange)]/10 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reset Ledger DB
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search transactions, logic, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-neutral-950/80 border border-neutral-900 focus:border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 outline-none transition-all"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-neutral-500" />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-neutral-950 border border-neutral-900 focus:border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="plaid">Plaid Financials</option>
            <option value="maps">Transit Telemetry</option>
            <option value="homeassistant">Home Energy</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-x-auto border border-neutral-950 bg-neutral-950/40 rounded-xl">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-950/80 text-neutral-400">
              <th className="p-3 font-semibold">Source</th>
              <th className="p-3 font-semibold">Title</th>
              <th 
                className="p-3 font-semibold cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  Timestamp <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-semibold text-right">Telemetry Amount</th>
              <th 
                className="p-3 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('carbon')}
              >
                <div className="flex items-center justify-end gap-1">
                  GHG Impact <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-semibold hidden lg:table-cell">Gemini / Go Pipeline Reasoning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900/60">
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-500 font-mono">
                  Zero active ledger packets match search filters
                </td>
              </tr>
            ) : (
              filteredLedger.map((entry) => (
                <tr 
                  key={entry.id} 
                  className="hover:bg-neutral-900/40 transition-colors group"
                >
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium ${getSourceBadge(entry.source)}`}>
                      {getSourceIcon(entry.source)}
                      {getSourceLabel(entry.source)}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-neutral-200">{entry.title}</td>
                  <td className="p-3 text-neutral-400 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="p-3 text-right text-neutral-300 font-semibold whitespace-nowrap">
                    {entry.unit === 'USD' && `$${entry.amount.toFixed(2)}`}
                    {entry.unit === 'KM' && `${entry.amount} KM`}
                    {entry.unit === 'KWH' && `${entry.amount} kWh`}
                  </td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">
                    <span className={entry.carbonFootprint > 150 ? 'text-[var(--neon-orange)]' : entry.carbonFootprint > 40 ? 'text-[var(--neon-yellow)]' : 'text-[var(--neon-green)]'}>
                      {entry.carbonFootprint} kg
                    </span>
                  </td>
                  <td className="p-3 text-neutral-500 hidden lg:table-cell text-[10px] leading-relaxed max-w-sm overflow-hidden text-ellipsis">
                    {entry.reasoning}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer */}
      <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
        <span>Showing {filteredLedger.length} of {ledger.length} events</span>
        <span>Database State: IMMUTABLE TIME-SERIES LEDGER</span>
      </div>
    </div>
  );
}
