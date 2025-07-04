"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertTriangle, Search, X } from 'lucide-react';

interface StockRecommendation {
  id: string;
  productName: string;
  currentStock: number;
  recommendedStock: number;
  status: 'low' | 'high' | 'optimal';
  reason: string;
}

// Dummy data untuk rekomendasi stok
const dummyRecommendations: StockRecommendation[] = [
  {
    id: '1',
    productName: 'Indomie Goreng',
    currentStock: 15,
    recommendedStock: 50,
    status: 'low',
    reason: 'Stok rendah, perlu restok segera'
  },
  {
    id: '2',
    productName: 'Aqua 600ml',
    currentStock: 200,
    recommendedStock: 150,
    status: 'high',
    reason: 'Stok berlebih, kurangi pembelian'
  },
  {
    id: '3',
    productName: 'Beras Premium 5kg',
    currentStock: 25,
    recommendedStock: 30,
    status: 'optimal',
    reason: 'Stok dalam kondisi baik'
  },
  {
    id: '4',
    productName: 'Minyak Goreng 1L',
    currentStock: 8,
    recommendedStock: 40,
    status: 'low',
    reason: 'Stok kritis, segera restok'
  },
  {
    id: '5',
    productName: 'Gula Pasir 1kg',
    currentStock: 35,
    recommendedStock: 35,
    status: 'optimal',
    reason: 'Stok sesuai target'
  },
  {
    id: '6',
    productName: 'Teh Botol Sosro',
    currentStock: 45,
    recommendedStock: 60,
    status: 'low',
    reason: 'Perlu tambah stok untuk weekend'
  },
  {
    id: '7',
    productName: 'Sabun Mandi Lifebuoy',
    currentStock: 80,
    recommendedStock: 50,
    status: 'high',
    reason: 'Stok berlebih, tunda pembelian'
  },
  {
    id: '8',
    productName: 'Kopi Kapal Api',
    currentStock: 22,
    recommendedStock: 25,
    status: 'optimal',
    reason: 'Stok normal'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'low':
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    case 'high':
      return <TrendingUp className="h-3 w-3 text-blue-500" />;
    case 'optimal':
      return <AlertTriangle className="h-3 w-3 text-green-500" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'low':
      return <Badge variant="destructive" className="text-xs">Rendah</Badge>;
    case 'high':
      return <Badge variant="secondary" className="text-xs">Berlebih</Badge>;
    case 'optimal':
      return <Badge variant="default" className="text-xs">Optimal</Badge>;
    default:
      return null;
  }
};

export function DailyStockRecommendations() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredRecommendations = dummyRecommendations.filter(recommendation =>
    recommendation.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Rekomendasi Stok Harian</h2>
        <Badge variant="outline">{new Date().toLocaleDateString('id-ID')}</Badge>
      </div>
      
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Menampilkan {filteredRecommendations.length} dari {dummyRecommendations.length} produk
      </div>
      
      {/* Grid Cards - Smaller and More Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRecommendations.map((recommendation) => (
          <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium leading-tight">
                  {recommendation.productName}
                </CardTitle>
                <div className="flex items-center gap-1 ml-2">
                  {getStatusIcon(recommendation.status)}
                </div>
              </div>
              <div className="mt-1">
                {getStatusBadge(recommendation.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Saat Ini</span>
                  <span className="text-sm font-semibold">{recommendation.currentStock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Rekomendasi Stok</span>
                  <span className="text-sm font-semibold text-primary">{recommendation.recommendedStock}</span>
                </div>
                <div className="pt-1">
                  <CardDescription className="text-xs leading-tight">
                    {recommendation.reason}
                  </CardDescription>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* No Results Message */}
      {filteredRecommendations.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Tidak ada produk yang ditemukan untuk "{searchTerm}"</p>
          <Button variant="outline" onClick={clearSearch} className="mt-2">
            Hapus Filter
          </Button>
        </div>
      )}
    </div>
  );
}