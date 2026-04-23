import { NextResponse } from 'next/server';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const OKX_REST_BASE = 'https://www.okx.com';
const PROXY_URL = 'http://127.0.0.1:8118';

function proxyFetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(PROXY_URL);
    https.get(url, { agent }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

let cachedKline: any = null;
let lastFetchTime = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (!cachedKline || now - lastFetchTime > 2000) {
      const url = `${OKX_REST_BASE}/api/v5/market/candles?instId=BTC-USDT&bar=1m&limit=1`;
      const json = await proxyFetch(url);

      if (json.code === '0' && json.data && json.data[0]) {
        const item = json.data[0];
        cachedKline = {
          time: Math.floor(parseInt(item[0]) / 1000),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        };
        lastFetchTime = now;
      }
    }

    return NextResponse.json(cachedKline || {});
  } catch (e: any) {
    console.error('Fetch latest kline error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
