'use client'

import { useState, useEffect } from 'react'
import type { DashboardData, DateRange } from '../types'

const DATE_RANGES: DateRange[] = [
  { label: '7 días', value: '7d', days: 7 },
  { label: '30 días', value: '30d', days: 30 },
  { label: '3 meses', value: 'month', days: 90 },
]

function fmt(n: number, decimals = 2): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-800/60 border border-gray-700/60 rounded-2xl p-5 animate-pulse ${className}`}>
      <div className="h-3 bg-gray-700/60 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-700/60 rounded w-32 mb-2" />
      <div className="h-3 bg-gray-700/60 rounded w-16" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 py-3 animate-pulse">
      <div className="h-3 bg-gray-700/60 rounded flex-1" />
      <div className="h-3 bg-gray-700/60 rounded w-16" />
      <div className="h-3 bg-gray-700/60 rounded w-12" />
    </div>
  )
}

// ─── Bar chart (CSS only) ───
function BarChart({ data, maxVal, height = 80 }: { data: Array<{ label: string; value: number }>; maxVal: number; height?: number }) {
  if (maxVal === 0) return <div className="text-gray-500 text-sm py-4 text-center">Sin datos</div>
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-0">
          <div
            className="w-full bg-amber-400/80 rounded-t-sm transition-all hover:bg-amber-400"
            style={{ height: `${Math.max(2, (d.value / maxVal) * height)}px` }}
            title={`${d.label}: ${fmt(d.value)}`}
          />
          <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Horizontal bar chart ───
function HBarChart({ data, maxVal, height = 28 }: { data: Array<{ label: string; value: number; color?: string }>; maxVal: number; height?: number }) {
  const colors = ['bg-amber-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-red-400']
  if (maxVal === 0) return <div className="text-gray-500 text-sm py-4 text-center">Sin datos</div>
  return (
    <div className="flex flex-col gap-2">
      {data.slice(0, 8).map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-24 truncate shrink-0">{d.label}</span>
          <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden relative">
            <div
              className={d.color ?? colors[i % colors.length]}
              style={{ width: `${Math.max(2, (d.value / maxVal) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-12 text-right shrink-0">{fmt(d.value, 0)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Stat card ───
function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border transition-colors ${accent
      ? 'bg-amber-400/10 border-amber-400/30'
      : 'bg-gray-800/60 border-gray-700/60'
      }`}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}

// ─── Section card ───
function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-700/60 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-700/60 bg-gray-800/40">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main page ───
export default function UsageDashboard() {
  const [range, setRange] = useState<'7d' | '30d' | 'month'>('7d')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/usage?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  const totalCost = data?.stats.totalCost ?? 0
  const maxDailyCost = Math.max(...(data?.daily.map(d => d.cost) ?? [0]), 0.001)
  const maxActivityCount = Math.max(...(data?.byActivity.map(a => a.count) ?? [0]), 0.001)

  return (
    <div className="min-h-screen" style={{ background: '#030712', fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800" style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-full mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">MyCompi Analytics</h1>
                <p className="text-xs text-gray-500">Token &amp; cost overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {DATE_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    range === r.value
                      ? 'bg-amber-400 text-gray-900'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 py-6">

        {/* ─── Stat cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                label="Total Cost"
                value={fmtCost(totalCost)}
                sub={'Last ' + (range === '7d' ? '7' : range === '30d' ? '30' : '90') + ' days'}
                accent
              />
              <StatCard
                label="Total Calls"
                value={fmt(data?.stats.totalCalls ?? 0, 0)}
                sub="Tool invocations"
              />
              <StatCard
                label="Cache Hit Rate"
                value={fmt((data?.stats.cacheHitRate ?? 0) * 100, 1) + '%'}
                sub="Tokens served from cache"
              />
              <StatCard
                label="Active Sessions"
                value={fmt(data?.stats.activeSessions ?? 0, 0)}
                sub="Unique sessions"
              />
            </>
          )}
        </div>

        {/* ─── Secondary stats ─── */}
        {!loading && data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Input Tokens" value={fmt(data.stats.inputTokens)} sub="Prompt tokens" />
            <StatCard label="Output Tokens" value={fmt(data.stats.outputTokens)} sub="Completion tokens" />
            <StatCard label="Cache Read" value={fmt(data.stats.cacheReadTokens)} sub="Cache hit tokens" />
            <StatCard label="Cache Write" value={fmt(data.stats.cacheWriteTokens)} sub="Cache stored tokens" />
          </div>
        )}

        {/* ─── Daily activity chart ─── */}
        <div className="mb-6">
          <SectionCard title="Daily Activity (Cost in $)">
            {loading ? (
              <div className="h-32 animate-pulse bg-gray-800/40 rounded-xl" />
            ) : (
              <BarChart
                data={(data?.daily ?? []).map(d => ({ label: d.date.slice(5), value: d.cost }))}
                maxVal={maxDailyCost}
                height={100}
              />
            )}
          </SectionCard>
        </div>

        {/* ─── Two-column section ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* By activity */}
          <SectionCard title="Activity Breakdown">
            {loading ? (
              <div className="space-y-2"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
            ) : (
              <HBarChart
                data={(data?.byActivity ?? []).map(a => ({ label: a.activity, value: a.count }))}
                maxVal={maxActivityCount}
              />
            )}
          </SectionCard>

          {/* By agent */}
          <SectionCard title="Cost by Agent">
            {loading ? (
              <div className="space-y-2"><SkeletonRow /><SkeletonRow /></div>
            ) : (
              <HBarChart
                data={(data?.byAgent ?? []).map(a => ({ label: a.agentName, value: a.cost }))}
                maxVal={Math.max(...(data?.byAgent.map(a => a.cost) ?? [0.001]), 0.001)}
              />
            )}
          </SectionCard>
        </div>

        {/* ─── Top sessions ─── */}
        <div className="mb-6">
          <SectionCard title="Top Sessions">
            {loading ? (
              <div className="space-y-2"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/60">
                      <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Session</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 px-2">Date</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 px-2">Cost</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 px-2">Calls</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 px-2">In Tokens</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 px-2">Out Tokens</th>
                      <th className="text-left text-xs text-gray-500 font-medium pb-2 pl-2">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topSessions ?? []).slice(0, 10).map(s => (
                      <tr key={s.sessionId} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 pr-4 font-mono text-xs text-amber-400/80">{s.sessionId.slice(0, 8)}…</td>
                        <td className="py-2 px-2 text-right text-gray-400">{s.date}</td>
                        <td className="py-2 px-2 text-right text-amber-400 font-medium">{fmtCost(s.cost)}</td>
                        <td className="py-2 px-2 text-right text-gray-400">{s.calls}</td>
                        <td className="py-2 px-2 text-right text-gray-400">{fmt(s.inputTokens)}</td>
                        <td className="py-2 px-2 text-right text-gray-400">{fmt(s.outputTokens)}</td>
                        <td className="py-2 pl-2 text-xs text-gray-400">{s.activity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ─── Two-column: top tools + shell commands ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Top Tools Used">
            {loading ? (
              <div className="space-y-2"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(data?.topTools ?? []).map((t, i) => (
                  <span
                    key={t.toolName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 border border-gray-700"
                  >
                    <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-gray-300">{t.toolName}</span>
                    <span className="text-gray-500">{t.count}</span>
                  </span>
                ))}
                {(data?.topTools ?? []).length === 0 && <span className="text-gray-500 text-sm">No data</span>}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Shell Commands">
            {loading ? (
              <div className="space-y-2"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(data?.shellCommands ?? []).map((c, i) => (
                  <span
                    key={c.command}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-gray-900 border border-gray-700 text-gray-300"
                  >
                    <span className="text-amber-400/60">$</span>
                    <span className="truncate max-w-48">{c.command}</span>
                    <span className="text-gray-500">{c.count}x</span>
                  </span>
                ))}
                {(data?.shellCommands ?? []).length === 0 && <span className="text-gray-500 text-sm">No shell commands recorded</span>}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}