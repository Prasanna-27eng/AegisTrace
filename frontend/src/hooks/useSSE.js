import { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';

/**
 * Fetch-based SSE hook (supports Authorization header, unlike native EventSource).
 * Reconnects automatically with exponential backoff on disconnect.
 *
 * @param {string|null} url   - Full URL to the SSE endpoint. Pass null to disable.
 * @param {function}    onMsg - Called with the parsed JSON payload of each data: line.
 * @returns {{ connected: boolean }}
 */
export default function useSSE(url, onMsg) {
  const token      = useStore(s => s.token);
  const onMsgRef   = useRef(onMsg);
  const [connected, setConnected] = useState(false);
  onMsgRef.current = onMsg;

  useEffect(() => {
    if (!url || !token) return;
    let cancelled = false;

    async function connect() {
      let delay = 1500;
      while (!cancelled) {
        try {
          const ctrl = new AbortController();
          const res  = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal:  ctrl.signal,
          });
          if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);

          setConnected(true);
          delay = 1500; // reset backoff on success

          const reader = res.body.getReader();
          const dec    = new TextDecoder();
          let buf      = '';

          while (!cancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete last line in buffer
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try { onMsgRef.current(JSON.parse(line.slice(6))); } catch {}
              }
            }
          }
        } catch {
          if (cancelled) break;
        }
        setConnected(false);
        if (!cancelled) await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 12000); // cap at 12s
      }
    }

    connect();
    return () => { cancelled = true; };
  }, [url, token]);

  return { connected };
}
