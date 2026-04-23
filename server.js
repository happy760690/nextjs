const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const { HttpsProxyAgent } = require('https-proxy-agent');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PROXY_URL = 'http://127.0.0.1:8118';

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', (ws) => {
    console.log('Client connected to BTC WebSocket');

    let currentBar = '1m';

    // ── Candle channel (business endpoint) ──────────────────────────────
    let okxWs = null;
    let okxPingInterval = null;
    let okxReconnectTimer = null;

    const subscribeCandle = (bar) => {
      if (okxWs && okxWs.readyState === WebSocket.OPEN) {
        okxWs.send(JSON.stringify({ op: 'subscribe', args: [{ channel: `candle${bar}`, instId: 'BTC-USDT' }] }));
        console.log(`OKX subscribed: candle${bar}`);
      }
    };

    const unsubscribeCandle = (bar) => {
      if (okxWs && okxWs.readyState === WebSocket.OPEN) {
        okxWs.send(JSON.stringify({ op: 'unsubscribe', args: [{ channel: `candle${bar}`, instId: 'BTC-USDT' }] }));
        console.log(`OKX unsubscribed: candle${bar}`);
      }
    };

    const connectOKX = () => {
      const agent = new HttpsProxyAgent(PROXY_URL);
      okxWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/business', { agent });

      okxWs.on('open', () => {
        console.log(`OKX business connected, subscribing candle${currentBar}`);
        subscribeCandle(currentBar);
        okxPingInterval = setInterval(() => {
          if (okxWs && okxWs.readyState === WebSocket.OPEN) okxWs.send('ping');
        }, 25000);
      });

      okxWs.on('message', (data) => {
        const raw = data.toString();
        if (raw === 'pong') return;
        try {
          const msg = JSON.parse(raw);
          if (msg.event) { console.log('OKX event:', msg.event, JSON.stringify(msg.arg)); return; }
          if (msg.arg?.channel?.startsWith('candle') && msg.data?.[0]) {
            const candle = msg.data[0];
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'candle',
                time:  Math.floor(parseInt(candle[0]) / 1000),
                open:  parseFloat(candle[1]),
                high:  parseFloat(candle[2]),
                low:   parseFloat(candle[3]),
                close: parseFloat(candle[4]),
              }));
            }
          }
        } catch (e) {
          console.error('OKX candle parse error:', e.message);
        }
      });

      okxWs.on('error', (e) => console.error('OKX business error:', e.message));

      okxWs.on('close', (code) => {
        console.log(`OKX business closed (${code}), reconnecting in 3s...`);
        if (okxPingInterval) { clearInterval(okxPingInterval); okxPingInterval = null; }
        okxReconnectTimer = setTimeout(connectOKX, 3000);
      });
    };

    // ── Index-tickers channel (public endpoint) ──────────────────────────
    let indexWs = null;
    let indexPingInterval = null;
    let indexReconnectTimer = null;

    const connectIndexTicker = () => {
      const agent = new HttpsProxyAgent(PROXY_URL);
      indexWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public', { agent });

      indexWs.on('open', () => {
        console.log('OKX public connected, subscribing index-tickers');
        indexWs.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'index-tickers', instId: 'BTC-USDT' }] }));
        indexPingInterval = setInterval(() => {
          if (indexWs && indexWs.readyState === WebSocket.OPEN) indexWs.send('ping');
        }, 25000);
      });

      indexWs.on('message', (data) => {
        const raw = data.toString();
        if (raw === 'pong') return;
        try {
          const msg = JSON.parse(raw);
          if (msg.event) return;
          if (msg.arg?.channel === 'index-tickers' && msg.data?.[0]) {
            const tick = msg.data[0];
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type:    'index',
                instId:  tick.instId,
                idxPx:   parseFloat(tick.idxPx),
                open24h: parseFloat(tick.open24h),
                high24h: parseFloat(tick.high24h),
                low24h:  parseFloat(tick.low24h),
                sodUtc0: parseFloat(tick.sodUtc0),
                sodUtc8: parseFloat(tick.sodUtc8),
                ts:      parseInt(tick.ts),
              }));
            }
          }
        } catch (e) {
          console.error('OKX index-tickers parse error:', e.message);
        }
      });

      indexWs.on('error', (e) => console.error('OKX public error:', e.message));

      indexWs.on('close', (code) => {
        console.log(`OKX public closed (${code}), reconnecting in 3s...`);
        if (indexPingInterval) { clearInterval(indexPingInterval); indexPingInterval = null; }
        indexReconnectTimer = setTimeout(connectIndexTicker, 3000);
      });
    };

    // ── Handle messages from client (bar switch) ─────────────────────────
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.op === 'setBar' && msg.bar) {
          const oldBar = currentBar;
          currentBar = msg.bar;
          console.log(`Client setBar: ${oldBar} → ${currentBar}`);
          unsubscribeCandle(oldBar);
          subscribeCandle(currentBar);
        }
      } catch (e) {
        console.error('Client message parse error:', e.message);
      }
    });

    connectOKX();
    connectIndexTicker();

    ws.on('close', () => {
      console.log('Client disconnected');
      if (okxReconnectTimer) clearTimeout(okxReconnectTimer);
      if (okxPingInterval) clearInterval(okxPingInterval);
      if (okxWs) okxWs.close();
      if (indexReconnectTimer) clearTimeout(indexReconnectTimer);
      if (indexPingInterval) clearInterval(indexPingInterval);
      if (indexWs) indexWs.close();
    });
  });

  // 处理 WebSocket 升级请求 — 只拦截 /api/btc-ws，其余交给 Next.js（HMR 等）
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url, true);
    if (pathname === '/api/btc-ws') {
      console.log('WebSocket upgrade: /api/btc-ws');
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
