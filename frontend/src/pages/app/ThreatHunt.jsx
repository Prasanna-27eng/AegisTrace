import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, Shield, GitMerge, Activity, Download, Database, Play, ChevronDown, ChevronRight } from '../../components/icons';
import api from '../../api/client';
import { SeverityBadge } from '../../components/SeverityBadge';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'iocs',      label: 'IOC Frequency' },
  { id: 'mitre',     label: 'MITRE Heatmap' },
  { id: 'campaigns', label: 'Campaign Alerts' },
  { id: 'search',    label: 'Cross-Case Search' },
  { id: 'sql',       label: 'SQL Console' },
];

const SQL_EXAMPLES = [
  {
    label: 'Recent failed logins',
    query: "SELECT ts, hostname, username, source_ip, raw\nFROM raw_log_events\nWHERE event_type = 'failed_login'\nORDER BY ts DESC\nLIMIT 50",
  },
  {
    label: 'Top source IPs by failed logins',
    query: "SELECT source_ip, count(*) AS attempts, count(DISTINCT username) AS usernames_tried\nFROM raw_log_events\nWHERE event_type = 'failed_login' AND source_ip IS NOT NULL\nGROUP BY source_ip\nORDER BY attempts DESC\nLIMIT 20",
  },
  {
    label: 'Critical/high raw logs (24h)',
    query: "SELECT ts, hostname, category, event_type, source, raw\nFROM raw_log_events\nWHERE severity IN ('critical','high') AND ts >= now() - INTERVAL 1 DAY\nORDER BY ts DESC\nLIMIT 50",
  },
  {
    label: 'ITDR alerts by severity',
    query: 'SELECT severity, count(*) AS alerts\nFROM itdr_alerts\nGROUP BY severity\nORDER BY alerts DESC',
  },
  {
    label: 'Endpoints by alert count',
    query: 'SELECT hostname, os_type, total_alerts, total_failed_logins, last_seen\nFROM endpoints\nORDER BY total_alerts DESC\nLIMIT 20',
  },
  {
    label: 'Defense events by attack type',
    query: 'SELECT attack_type, status, count(*) AS n\nFROM defense_events\nGROUP BY attack_type, status\nORDER BY n DESC\nLIMIT 30',
  },
];

const TACTIC_COLOR = {
  'Initial Access': '#4A7EC8', 'Execution': '#EF4444', 'Persistence': '#EAB308',
  'Privilege Escalation': '#F97316', 'Defense Evasion': '#8BB8E8',
  'Credential Access': '#EC4899', 'Discovery': '#22C55E',
  'Lateral Movement': '#06B6D4', 'Collection': '#4A7EC8',
  'Command and Control': '#8B5CF6', 'Exfiltration': '#F59E0B',
  'Impact': '#EF4444',
};

export default function ThreatHunt() {
  useEffect(() => { document.title = 'Threat Hunt | AegisTrace'; }, []);
  const navigate = useNavigate();
  const [tab, setTab]         = useState('iocs');
  const [iocs, setIocs]       = useState([]);
  const [mitre, setMitre]     = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // SQL Console
  const [sqlQuery, setSqlQuery]     = useState(SQL_EXAMPLES[0].query);
  const [sqlResult, setSqlResult]   = useState(null);
  const [sqlError, setSqlError]     = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlSchema, setSqlSchema]   = useState(null);
  const [schemaOpen, setSchemaOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/hunt/iocs?min_cases=1&limit=50'),
      api.get('/api/hunt/mitre'),
      api.get('/api/hunt/campaigns'),
      api.get('/api/hunt/stats'),
    ]).then(([iocRes, mitreRes, campRes, statsRes]) => {
      setIocs(iocRes.data);
      setMitre(mitreRes.data);
      setCampaigns(campRes.data);
      setStats(statsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const search = async () => {
    if (!q.trim() || q.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await api.get(`/api/hunt/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch { }
    setSearching(false);
  };

  // SQL Console — load the schema reference once, on first visit to the tab
  useEffect(() => {
    if (tab === 'sql' && !sqlSchema) {
      api.get('/api/hunt/sql/schema')
        .then(r => setSqlSchema(r.data.views))
        .catch(() => setSqlSchema({}));
    }
  }, [tab, sqlSchema]);

  const runSql = async () => {
    if (!sqlQuery.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    try {
      const res = await api.post('/api/hunt/sql', { query: sqlQuery, limit: 200 });
      setSqlResult(res.data);
    } catch (e) {
      setSqlResult(null);
      setSqlError(e.response?.data?.detail || 'Query failed');
    }
    setSqlLoading(false);
  };

  const maxMitreCount = mitre.length > 0 ? mitre[0].count : 1;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Threat Hunting</h1>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
            Cross-case correlation · Campaign detection · MITRE heatmap
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Cases',         val: stats.total_cases,        color: 'var(--text-primary)' },
            { label: 'IOCs Tracked',        val: stats.total_iocs_tracked, color: '#8BB8E8' },
            { label: 'Campaign IOCs',       val: stats.campaign_iocs,      color: 'var(--accent)' },
            { label: 'Multi-Case IOCs',     val: stats.multi_case_iocs,    color: '#EAB308' },
            { label: 'Events (7 days)',     val: stats.events_last_7_days, color: '#22C55E' },
          ].map(({ label, val, color }) => (
            <div key={label} className="at-card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{val ?? '—'}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(26,22,18,0.08)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'campaigns' && campaigns.length > 0 && (
              <span style={{ marginLeft: 6, background: 'rgba(90,138,159,0.2)', color: 'var(--accent)', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', fontFamily: 'JetBrains Mono' }}>{campaigns.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="at-card" style={{ padding: '14px 16px' }}>
                <div className="skeleton" style={{ height: 24, width: 48, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 9, width: 80 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="at-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="skeleton" style={{ height: 9, width: 46 }} />
                <div className="skeleton" style={{ flex: 1, height: 10 }} />
                <div className="skeleton" style={{ height: 20, width: 60 }} />
                <div className="skeleton" style={{ height: 20, width: 80 }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* IOC Frequency */}
          {tab === 'iocs' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <select className="at-select" style={{ fontSize: '0.78rem' }}
                  onChange={e => api.get(`/api/hunt/iocs?min_cases=1&ioc_type=${e.target.value}&limit=50`).then(r => setIocs(r.data))}>
                  <option value="">All Types</option>
                  {['ip','domain','url','sha256','md5','email','hash','geo'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {iocs.length === 0 ? (
                <div className="at-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No IOCs tracked yet. Add IOCs to cases to see frequency analysis.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {iocs.map(ioc => (
                    <div key={ioc.id} className="at-card" style={{ padding: '12px 16px', borderLeft: ioc.is_campaign ? '2px solid #C0392B' : '1px solid rgba(26,22,18,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#8BB8E8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ioc.ioc}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', background: 'rgba(26,22,18,0.05)', padding: '2px 6px', borderRadius: 3 }}>{ioc.ioc_type}</span>
                        {ioc.is_campaign && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontFamily: 'JetBrains Mono', background: 'rgba(90,138,159,0.1)', border: '1px solid rgba(204,120,92,0.25)', padding: '2px 6px', borderRadius: 3 }}>⚠ CAMPAIGN</span>
                        )}
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ioc.case_count > 1 ? '#4A7EC8' : '#787878' }}>{ioc.case_count} case{ioc.case_count !== 1 ? 's' : ''}</span>
                      </div>
                      {ioc.cases?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {ioc.cases.map(c => (
                            <button key={c.id} onClick={() => navigate(`/app/cases/${c.id}`)}
                              style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.09)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', gap: 5, alignItems: 'center' }}>
                              <SeverityBadge severity={c.severity} />
                              {c.case_number}
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6, fontFamily: 'JetBrains Mono' }}>
                        First seen: {new Date(ioc.first_seen).toLocaleDateString()} · Last seen: {new Date(ioc.last_seen).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MITRE Heatmap */}
          {tab === 'mitre' && (
            <div>
              {mitre.length === 0 ? (
                <div className="at-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No MITRE techniques mapped yet. Generate AI analysis on cases to populate this heatmap.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 10 }}>
                  {mitre.map(m => {
                    const pct = Math.round((m.count / maxMitreCount) * 100);
                    const color = TACTIC_COLOR[m.tactic] || '#787878';
                    return (
                      <div key={m.technique_id} className="at-card" style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: '0.75rem', color: '#8BB8E8', fontFamily: 'JetBrains Mono', minWidth: 80 }}>{m.technique_id}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1 }}>{m.name}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{m.count}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: 'rgba(26,22,18,0.09)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', minWidth: 28 }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color, fontFamily: 'JetBrains Mono', marginTop: 5, opacity: 0.8 }}>{m.tactic}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Campaigns */}
          {tab === 'campaigns' && (
            <div>
              {campaigns.length === 0 ? (
                <div className="at-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertTriangle size={28} style={{ color: 'rgba(204,120,92,0.25)', margin: '0 auto 10px' }} />
                  No campaign-level correlations yet. IOCs appearing in 3+ cases trigger campaign alerts.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {campaigns.map((camp, i) => (
                    <div key={i} className="at-card" style={{ padding: '16px 18px', borderLeft: '2px solid #C0392B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <AlertTriangle size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#8BB8E8', flex: 1 }}>{camp.ioc}</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono' }}>
                          {camp.case_count} CASES
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{camp.ioc_type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {camp.cases.map(c => (
                          <button key={c.id} onClick={() => navigate(`/app/cases/${c.id}`)}
                            style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.09)', borderRadius: 4, padding: '4px 9px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', gap: 5, alignItems: 'center' }}>
                            <SeverityBadge severity={c.severity} /> {c.case_number}
                          </button>
                        ))}
                      </div>
                      {camp.shared_mitre?.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                          Shared MITRE: {camp.shared_mitre.map(m => m.id).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cross-Case Search */}
          {tab === 'search' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 600 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="at-input" placeholder="Search across all cases, IOCs, findings…" value={q}
                    onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
                    style={{ paddingLeft: 30, fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }} />
                </div>
                <button className="btn-accent" onClick={search} disabled={searching || q.trim().length < 2} style={{ flexShrink: 0 }}>
                  {searching ? <Loader2 size={14} className="spinner" /> : <><Search size={14} /> Search</>}
                </button>
              </div>

              {searchResults && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {searchResults.ioc_matches?.length > 0 && (
                    <div>
                      <div className="section-label">IOC Matches ({searchResults.ioc_matches.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {searchResults.ioc_matches.map((ioc, i) => (
                          <div key={i} className="at-card" style={{ padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#8BB8E8', flex: 1 }}>{ioc.ioc}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', background: 'rgba(26,22,18,0.05)', padding: '2px 6px', borderRadius: 3 }}>{ioc.ioc_type}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ioc.case_count > 1 ? '#4A7EC8' : '#787878' }}>{ioc.case_count} case{ioc.case_count !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.case_matches?.length > 0 && (
                    <div>
                      <div className="section-label">Case Matches ({searchResults.case_matches.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {searchResults.case_matches.map(c => (
                          <div key={c.id} className="at-card" style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
                            onClick={() => navigate(`/app/cases/${c.id}`)}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{c.title}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{c.case_number}</div>
                            </div>
                            <SeverityBadge severity={c.severity} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.ioc_matches?.length === 0 && searchResults.case_matches?.length === 0 && (
                    <div className="at-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No results found for "{q}"</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SQL Console */}
          {tab === 'sql' && (
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14, fontFamily: 'JetBrains Mono' }}>
                Read-only SQL over your telemetry, powered by DuckDB — SELECT / WITH only, capped at 200 rows and 10s.
              </div>

              {/* Schema reference */}
              <div className="at-card" style={{ padding: 0, marginBottom: 14 }}>
                <div
                  onClick={() => setSchemaOpen(o => !o)}
                  style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#7A9DB8' }}
                >
                  {schemaOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <Database size={13} style={{ color: 'var(--accent)' }} />
                  Available tables {sqlSchema ? `(${Object.keys(sqlSchema).length})` : ''}
                </div>
                {schemaOpen && (
                  <div style={{ borderTop: '1px solid rgba(26,22,18,0.07)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!sqlSchema ? (
                      <Loader2 size={14} className="spinner" style={{ color: 'var(--accent)' }} />
                    ) : Object.entries(sqlSchema).map(([view, cols]) => (
                      <div key={view}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#8BB8E8', marginBottom: 4 }}>{view}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {cols.map(c => (
                            <span key={c.name} title={c.type} style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.08)', padding: '1px 6px', borderRadius: 3 }}>
                              {c.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Examples */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Examples:</span>
                <select
                  className="at-select"
                  style={{ fontSize: '0.74rem' }}
                  value=""
                  onChange={e => { if (e.target.value) setSqlQuery(e.target.value); }}
                >
                  <option value="">Pick a starting query…</option>
                  {SQL_EXAMPLES.map(ex => (
                    <option key={ex.label} value={ex.query}>{ex.label}</option>
                  ))}
                </select>
              </div>

              {/* Query editor */}
              <textarea
                className="at-input"
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runSql(); }}
                placeholder="SELECT * FROM raw_log_events LIMIT 50"
                style={{ width: '100%', minHeight: 120, fontFamily: 'JetBrains Mono', fontSize: '0.8rem', resize: 'vertical', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 16 }}>
                <button className="btn-accent" onClick={runSql} disabled={sqlLoading || !sqlQuery.trim()}>
                  {sqlLoading ? <Loader2 size={14} className="spinner" /> : <Play size={14} />} Run
                </button>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>⌘/Ctrl + Enter to run</span>
                {sqlResult && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>
                    {sqlResult.row_count} row{sqlResult.row_count !== 1 ? 's' : ''}{sqlResult.truncated ? ' (truncated to 200)' : ''}
                  </span>
                )}
              </div>

              {/* Error */}
              {sqlError && (
                <div className="at-card" style={{ padding: '12px 16px', borderLeft: '2px solid #EF4444', color: '#EF4444', fontFamily: 'JetBrains Mono', fontSize: '0.78rem', marginBottom: 14 }}>
                  {sqlError}
                </div>
              )}

              {/* Results */}
              {sqlResult && (
                sqlResult.rows.length === 0 ? (
                  <div className="at-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Query returned no rows.</div>
                ) : (
                  <div className="at-card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono', fontSize: '0.74rem' }}>
                      <thead>
                        <tr>
                          {sqlResult.columns.map(c => (
                            <th key={c} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(26,22,18,0.09)', color: '#8BB8E8', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#0A0A0A' }}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.rows.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(26,22,18,0.05)' }}>
                            {row.map((v, j) => (
                              <td key={j} style={{ padding: '6px 12px', color: '#7A9DB8', whiteSpace: 'nowrap', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {v === null || v === undefined ? <span style={{ color: '#444' }}>—</span> : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
