import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus, Trash2, AlertTriangle,
  Tag, HardDrive, ShieldAlert
} from 'lucide-react'
import {
  getWatchlist, addKeyword,
  removeKeyword, getWatchlistHits
} from '../api/client'
import PageLayout from '../components/PageLayout'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'suspect_name',
  'location',
  'organization',
  'ip_address',
  'financial_term',
  'malware_indicator',
  'communication',
  'custom'
]

const CAT_COLOR = {
  suspect_name:      'bg-red-500/20 text-red-400',
  location:          'bg-teal-500/20 text-teal-400',
  organization:      'bg-yellow-500/20 text-yellow-400',
  ip_address:        'bg-purple-500/20 text-purple-400',
  financial_term:    'bg-green-500/20 text-green-400',
  malware_indicator: 'bg-danger/20 text-danger',
  communication:     'bg-blue-500/20 text-blue-400',
  custom:            'bg-gray-500/20 text-gray-400'
}

export default function WatchlistPage() {
  const { caseId } = useParams()
  const [keywords, setKeywords] = useState([])
  const [hits, setHits] = useState([])
  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('custom')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [caseId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [kwRes, hitRes] = await Promise.all([
        getWatchlist(caseId),
        getWatchlistHits(caseId)
      ])
      setKeywords(kwRes.data)
      setHits(hitRes.data)
    } catch {
      toast.error('Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newKeyword.trim()) return
    try {
      const res = await addKeyword(caseId, {
        keyword: newKeyword.trim(),
        category: newCategory
      })
      setKeywords(prev => [...prev, res.data])
      setNewKeyword('')
      toast.success(`Keyword "${res.data.keyword}" added`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add keyword')
    }
  }

  const handleRemove = async (id, keyword) => {
    try {
      await removeKeyword(caseId, id)
      setKeywords(prev => prev.filter(k => k.id !== id))
      toast.success(`Keyword "${keyword}" removed`)
    } catch {
      toast.error('Failed to remove keyword')
    }
  }

  const totalHits = keywords.reduce((sum, k) => sum + (k.hit_count || 0), 0)

  return (
    <PageLayout
      title="Keyword Watchlist"
      subtitle="Add keywords to automatically flag matching artifacts during ingestion."
      actions={
        <div className="text-right bg-surface-2 border border-warning/30 rounded-xl px-4 py-3">
          <p className="text-3xl font-bold text-warning">{totalHits}</p>
          <p className="text-xs text-ink-2">total hits</p>
          <p className="text-xs text-ink-2 mt-0.5">{hits.length} flagged artifacts</p>
        </div>
      }
    >
      {/* Add keyword form */}
      <div className="bg-surface-2 border border-line rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-0 mb-3">Add Keyword</h2>
        <div className="flex gap-3">
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. John Smith, nyx@proton.me, 192.168.1.1, ransomware"
            className="flex-1 bg-surface-1 border border-line rounded-xl px-3 py-2
              text-sm text-ink-0 placeholder:text-ink-2
              focus:outline-none focus:border-accent transition-colors"
          />
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="bg-surface-1 border border-line rounded-xl px-3 py-2
              text-sm text-ink-0 focus:outline-none focus:border-accent
              transition-colors"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!newKeyword.trim()}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        <p className="text-xs text-ink-2 mt-2">
          Keywords are case-insensitive and checked against all text extracted
          from every evidence file during ingestion.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Keywords list */}
        <div>
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">
            Active Keywords ({keywords.length})
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-ink-2">
              <div className="w-5 h-5 border-2 border-accent rounded-full border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map(kw => (
                <div
                  key={kw.id}
                  className="bg-surface-2 border border-line rounded-xl p-3
                    flex items-center gap-3 group hover:border-accent/30 transition-colors"
                >
                  <Tag size={13} className="text-ink-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-0 truncate">
                      {kw.keyword}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {kw.category && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                            ${CAT_COLOR[kw.category] || CAT_COLOR.custom}`}
                        >
                          {kw.category.replace(/_/g, ' ')}
                        </span>
                      )}
                      {kw.hit_count > 0 ? (
                        <span className="text-xs text-warning font-medium">
                          ⚑ {kw.hit_count} hit{kw.hit_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-2">No hits yet</span>
                      )}
                      <span className="text-xs text-ink-2">
                        by {kw.added_by}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(kw.id, kw.keyword)}
                    className="opacity-0 group-hover:opacity-100 text-ink-2
                      hover:text-danger transition-all p-1 rounded"
                    title="Remove keyword"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {keywords.length === 0 && (
                <div className="text-center py-10 text-ink-2">
                  <Tag size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No keywords defined</p>
                  <p className="text-xs mt-1">
                    Add terms above. They will be automatically checked
                    against every future ingestion.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flagged artifact hits */}
        <div>
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">
            Flagged Artifacts ({hits.length})
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-ink-2">
              <div className="w-5 h-5 border-2 border-accent rounded-full border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {hits.map(hit => (
                <div
                  key={hit.id}
                  className="bg-surface-2 border border-warning/25 rounded-xl p-3
                    hover:border-warning/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={13}
                      className="text-warning shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-0 truncate">
                        {hit.filename}
                      </p>
                      <p className="text-xs text-ink-2 font-mono truncate mt-0.5">
                        {hit.internal_path}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-ink-2">
                          Modified: {hit.modified_at?.slice(0, 10) || 'Unknown'}
                        </span>
                        {hit.extraction_type && (
                          <span className="text-xs text-accent">
                            {hit.extraction_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hits.length === 0 && (
                <div className="text-center py-10 text-ink-2">
                  <HardDrive size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No flagged artifacts yet</p>
                  <p className="text-xs mt-1">
                    Keywords are checked during ingestion.
                    Upload a file after adding keywords to see hits here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
