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

export async function GET() {
  try {
    const [tickerJson, fundingJson] = await Promise.all([
      proxyFetch(`${OKX_REST_BASE}/api/v5/market/ticker?instId=BTC-USDT`),
      proxyFetch(`${OKX_REST_BASE}/api/v5/public/funding-rate?instId=BTC-USDT-SWAP`),
    ]);

    const ticker = tickerJson.data?.[0];
    const funding = fundingJson.data?.[0];

    if (!ticker) {
      return NextResponse.json({ error: 'No ticker data' }, { status: 500 });
    }

    const lastPrice = parseFloat(ticker.last);
    const open24h = parseFloat(ticker.open24h);
    const priceChange = lastPrice - open24h;
    const priceChangePercent = open24h ? (priceChange / open24h) * 100 : 0;

    return NextResponse.json({
      price: lastPrice,
      priceChange,
      priceChangePercent,
      indexPrice: lastPrice,
      markPrice: lastPrice,
      fundingRate: funding ? parseFloat(funding.fundingRate) * 100 : 0,
      nextFundingTime: funding ? parseInt(funding.nextFundingTime) : 0,
      high24h: parseFloat(ticker.high24h),
      low24h: parseFloat(ticker.low24h),
      openInterest: 0,
      volume24h: parseFloat(ticker.vol24h),
      amount24h: parseFloat(ticker.volCcy24h),
    });
  } catch (e: any) {
    console.error('Fetch OKX stats error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
