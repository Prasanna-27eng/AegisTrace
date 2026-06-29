import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, Shield, Globe, Bug, Server,
  ExternalLink, Loader2, Clock, ChevronDown, ChevronRight
} from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const SOURCE_META = {
  cisa_kev:      { label: 'CISA KEV',        color: '#4A7EC8', icon: AlertTriangle, url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
  urlhaus:       { label: 'URLhaus',          color: '#EF4444', icon: Globe,         url: 'https://urlhaus.abuse.ch/' },
  threatfox:     { label: 'ThreatFox',        color: '#EAB308', icon: Shield,        url: 'https://threatfox.abuse.ch/' },
  malwarebazaar: { label: 'MalwareBazaar',    color: '#8BB8E8', icon: Bug,           url: 'https://bazaar.abuse.ch/' },
  feodotracker:  { label: 'Feodo Tracker',    color: '#22C55E', icon: Server,        url: 'https://feodotracker.abuse.ch/' },
};

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(isoStr).toLocaleDateString();
}

function SourceBadge({ source }) {
  const m = SOURCE_META[source] || { label: source, color: '#787878' };
  return (
    <span style={{
      fontSize: '0.62rem', fontFamily: 'JetBrains Mono', fontWeight: 600,
      padding: '2px 6px', borderRadius: 4, background: `${m.color}22`, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

function FeedSection({ feedKey, data, navigate }) {
  const [open, setOpen] = useState(true);
  const meta = SOURCE_META[feedKey] || {};
  const Icon = meta.icon || Shield;
  const items = data.items || data.recent || [];

  if (data.error) return (
    <div className="at-card" style={{ padding: '12px 16px', borderColor: 'rgba(239,68,68,0.2)' }}>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: '0.76rem' }}>
        <Icon size={13} style={{ color: meta.color }} />
        <span style={{ fontWeight: 600 }}>{meta.label}</span>
        <span style={{ color: '#EF4444', fontSize: '0.7rem' }}>⚠ {data.error}</span>
      </div>
    </div>
  );

  return (
    <div className="at-card" style={{ padding: '12px 16px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: open ? 12 : 0 }}
        onClick={() => setOpen(v => !v)}
      >
        <Icon size={13} style={{ color: meta.color }} />
        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{meta.label}</span>
        <span style={{ fontSize: '0.68rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>
          {data.total != null ? `${data.total} entries` : ''}
          {data.date_released ? ` · Updated ${timeAgo(data.date_released)}` : ''}
        </span>
        <a href={meta.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          style={{ marginLeft: 4, color: '#787878' }}>
          <ExternalLink size={10} />
        </a>
        <span style={{ marginLeft: 'auto' }}>
          {open ? <ChevronDown size={12} style={{ color: '#787878' }} /> : <ChevronRight size={12} style={{ color: '#787878' }} />}
        </span>
      </div>

      {open && items.length === 0 && (
        <div style={{ fontSize: '0.75rem', color: '#787878', padding: '8px 0' }}>No items returned.</div>
      )}

      {open && items.length > 0 && (
        <>
          {/* CISA KEV */}
          {feedKey === 'cisa_kev' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {items.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 10px', background: '#0E0E16', borderRadius: 5, fontSize: '0.74rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', color: '#EF4444', fontWeight: 600, fontSize: '0.7rem' }}>{v.cve_id}</span>
                      <span style={{ fontWeight: 500 }}>{v.vendor} — {v.product}</span>
                    </div>
                    <div style={{ color: '#787878', fontSize: '0.68rem', lineHeight: 1.4 }}>{v.description}</div>
                    {v.action && <div style={{ color: '#EAB308', fontSize: '0.67rem', marginTop: 3 }}>→ {v.action}</div>}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.62rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>Added {v.date_added}</div>
                    <div style={{ fontSize: '0.62rem', color: '#EF4444', fontFamily: 'JetBrains Mono' }}>Due {v.due_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* URLhaus */}
          {feedKey === 'urlhaus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((u, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#0E0E16', borderRadius: 5, fontSize: '0.72rem', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                    background: u.url_status === 'online' ? 'rgba(239,68,68,0.12)' : 'rgba(136,136,136,0.12)',
                    color: u.url_status === 'online' ? '#EF4444' : '#787878',
                    fontFamily: 'JetBrains Mono', fontWeight: 600,
                  }}>{u.url_status}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#909090', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: '0.68rem' }}>{u.url}</span>
                  {u.tags?.length > 0 && <span style={{ color: '#8BB8E8', fontSize: '0.62rem', flexShrink: 0 }}>{u.tags.slice(0, 2).join(', ')}</span>}
                  <span style={{ color: '#787878', fontSize: '0.62rem', flexShrink: 0, fontFamily: 'JetBrains Mono' }}>{timeAgo(u.date_added)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ThreatFox */}
          {feedKey === 'threatfox' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#0E0E16', borderRadius: 5, fontSize: '0.72rem', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                    background: 'rgba(234,179,8,0.1)', color: '#EAB308',
                    fontFamily: 'JetBrains Mono', fontWeight: 600, textTransform: 'uppercase',
                  }}>{t.ioc_type}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#909090', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: '0.68rem' }}>{t.ioc}</span>
                  <span style={{ color: '#787878', fontSize: '0.7rem', flexShrink: 0 }}>{t.malware || t.threat_type}</span>
                  <span style={{ color: '#787878', fontSize: '0.62rem', flexShrink: 0, fontFamily: 'JetBrains Mono' }}>{t.confidence}%</span>
                </div>
              ))}
            </div>
          )}

          {/* MalwareBazaar */}
          {feedKey === 'malwarebazaar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#0E0E16', borderRadius: 5, fontSize: '0.72rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#8BB8E8', fontSize: '0.62rem', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sha256?.slice(0, 12)}…</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.file_name || s.sha256}</span>
                  <span style={{ color: '#EF4444', fontSize: '0.7rem', flexShrink: 0 }}>{s.signature || s.file_type}</span>
                  <span style={{ color: '#787878', fontSize: '0.62rem', flexShrink: 0, fontFamily: 'JetBrains Mono' }}>{timeAgo(s.first_seen)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Feodo Tracker */}
          {feedKey === 'feodotracker' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#0E0E16', borderRadius: 5, fontSize: '0.72rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#EF4444', minWidth: 110, fontWeight: 500 }}>{h.ip}{h.port ? `:${h.port}` : ''}</span>
                  <span style={{ color: '#EAB308', flex: 1 }}>{h.malware}</span>
                  <span style={{ color: '#787878', fontSize: '0.62rem', flexShrink: 0, fontFamily: 'JetBrains Mono' }}>last online {h.last_online || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ThreatFeeds() {
  const { addToast } = useStore();
  const navigate     = useNavigate();
  const [feeds, setFeeds]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);

  const load = useCallback(async (forceRefresh = false) => {
    forceRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const r = await api.get(`/api/feeds/all${forceRefresh ? '?force_refresh=true' : ''}`);
      setFeeds(r.data.feeds);
      setFetchedAt(r.data.fetched_at);
    } catch (e) {
      addToast('Failed to load threat feeds', 'error');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1000 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Live Threat Intel Feeds</h1>
          <div style={{ fontSize: '0.72rem', color: '#787878', marginTop: 3 }}>
            CISA KEV · URLhaus · ThreatFox · MalwareBazaar · Feodo Tracker — refreshed every 5 min
            {fetchedAt && <span style={{ fontFamily: 'JetBrains Mono', marginLeft: 8 }}>· Last fetch: {timeAgo(fetchedAt)}</span>}
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-ghost"
          style={{ fontSize: '0.78rem', gap: 5 }}
        >
          {refreshing
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <RefreshCw size={13} />}
          Refresh All
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0', color: '#787878' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: '#8BB8E8' }} />
          <div style={{ fontSize: '0.82rem' }}>Fetching threat intelligence feeds…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feeds && Object.entries(feeds).map(([key, data]) => (
            <FeedSection key={key} feedKey={key} data={data} navigate={navigate} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
