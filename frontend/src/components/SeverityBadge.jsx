import React from 'react';

export function SeverityBadge({ severity }) {
  return (
    <span className={`badge sev-${severity?.toLowerCase()}`}>
      {severity?.toUpperCase()}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge status-${status?.toLowerCase()}`}>
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export function VerdictBadge({ verdict }) {
  const colors = {
    malicious:  'bg-red-500/10 text-red-400 border border-red-500/30',
    suspicious: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    clean:      'bg-green-500/10 text-green-400 border border-green-500/30',
    unknown:    'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  };
  return (
    <span className={`badge ${colors[verdict] || colors.unknown}`}>
      {verdict?.toUpperCase()}
    </span>
  );
}
