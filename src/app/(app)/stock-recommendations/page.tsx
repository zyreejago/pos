import type { Metadata } from 'next';
import { DailyStockRecommendations } from '@/components/dashboard/daily-stock-recommendations';

export const metadata: Metadata = {
  title: 'Rekomendasi Stok Harian - Toko App',
  description: 'Rekomendasi stok harian berdasarkan analisis penjualan dan inventory',
};

export default function StockRecommendationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <DailyStockRecommendations />
    </div>
  );
}