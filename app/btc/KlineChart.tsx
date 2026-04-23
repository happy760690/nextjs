'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart, CandlestickSeries, CandlestickData,
  Time, UTCTimestamp, IChartApi, ISeriesApi,
} from 'lightweight-charts';

type Bar = '1s' | '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

const BARS: { label: string; value: Bar }[] = [
  { label: '1s', value: '1s' }, { label: '1m', value: '1m' },
  { label: '5m', value: '5m' }, { label: '15m', value: '15m' },
  { label: '1H', value: '1H' }, { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
];

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/btc-ws`
  : '';

export default function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef  = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [bar, setBar] = useState<Bar>('1m');
  const [connected, setConnected] = useState(false);

  const lastBarTimeRef   = useRef<number | null>(null);
  const historyLoadedRef = useRef(false);

  // ── 创建图表(一次)─────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: '#1a1a2e' }, textColor: '#d1d4dc' },
      grid:   { vertLines: { color: '#2b2b43' }, horzLines: { color: '#2b2b43' } },
      width:  chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: { timeVisible: true, secondsVisible: true },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (chartContainerRef.current)
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // ── 加载历史(切 bar 时重跑)────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    let cancelled = false;
    historyLoadedRef.current = false;
    lastBarTimeRef.current   = null;

    fetch(`/api/btc-klines?bar=${bar}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const normalized: CandlestickData<Time>[] = data.map(d => ({
          time:  d.time as UTCTimestamp,
          open:  d.open, high: d.high, low: d.low, close: d.close,
        }));
        series.setData(normalized);
        lastBarTimeRef.current = normalized[normalized.length - 1].time as number;
        historyLoadedRef.current = true;
        console.log(`[history] ${bar}: ${normalized.length} bars`);
      })
      .catch(e => console.error('[history] error:', e));

    return () => { cancelled = true; };
  }, [bar]);

  // ── WebSocket 实时 ─────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByUs = false;

    const connect = () => {
      console.log('[ws] connecting to', WS_URL);
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[ws] connected');
        setConnected(true);
        ws?.send(JSON.stringify({ op: 'setBar', bar }));
      };

      ws.onmessage = (ev) => {
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === 'error') { console.error('[ws] server error:', msg.message); return; }
        if (msg.type !== 'candle') return;
        if (!historyLoadedRef.current) return;

        const time  = msg.time as UTCTimestamp;
        const open  = msg.open;
        const high  = msg.high;
        const low   = msg.low;
        const close = msg.close;
        if (!Number.isFinite(time as number)) return;

        const lastT = lastBarTimeRef.current ?? -Infinity;
        if ((time as number) < lastT) return;

        series.update({ time, open, high, low, close });
        lastBarTimeRef.current = time as number;
      };

      ws.onerror = () => {
        console.warn('[ws] error event, readyState:', ws?.readyState, 'url:', ws?.url);
      };
      ws.onclose = (ev) => {
        console.log('[ws] closed, code:', ev.code, 'reason:', ev.reason, 'wasClean:', ev.wasClean);
        setConnected(false);
        if (!closedByUs) reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [bar]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1">
          {BARS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setBar(value)}
              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                bar === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={`ml-auto flex items-center gap-1 text-xs ${connected ? 'text-green-500' : 'text-gray-400'}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          {connected ? 'Live' : 'Connecting...'}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ background: '#1a1a2e' }}
      />
    </div>
  );
}