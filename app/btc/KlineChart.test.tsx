import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KlineChart from '@/app/btc/KlineChart';

// Mock lightweight-charts
vi.mock('lightweight-charts', async () => {
  const actual = await vi.importActual('lightweight-charts');
  return {
    ...actual,
    createChart: vi.fn(() => ({
      addSeries: vi.fn(() => ({
        setData: vi.fn(),
        update: vi.fn(),
      })),
      applyOptions: vi.fn(),
      remove: vi.fn(),
    })),
    CandlestickSeries: {},
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('KlineChart', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([
        { time: 1713801600, open: 62000, high: 62500, low: 61800, close: 62300 },
        { time: 1713801660, open: 62300, high: 62800, low: 62200, close: 62600 },
      ]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders bar selection buttons', () => {
    render(<KlineChart />);
    const buttons = ['1s', '1m', '5m', '15m', '1H', '4H', '1D'];
    buttons.forEach(bar => {
      expect(screen.getByRole('button', { name: bar })).toBeInTheDocument();
    });
  });

  it('renders chart container', () => {
    render(<KlineChart />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });

  it('shows connecting status initially', () => {
    render(<KlineChart />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('changes selected bar on button click', async () => {
    render(<KlineChart />);
    const btn1H = screen.getByRole('button', { name: '1H' });
    await user.click(btn1H);
    expect(btn1H).toHaveClass('bg-blue-600');
  });

  it('fetches history data when bar changes', async () => {
    render(<KlineChart />);
    const btn1H = screen.getByRole('button', { name: '1H' });
    await user.click(btn1H);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/btc-klines?bar=1H');
    });
  });

  it('handles empty history data gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    });

    render(<KlineChart />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<KlineChart />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[history] error:'), expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
