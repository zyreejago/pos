
import type { Metadata } from 'next';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Manajemen Stok - Toko App',
  description: 'Lihat dan kelola stok produk Anda.',
};

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Manajemen Stok</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Daftar Stok Produk</CardTitle>
          <CardDescription>Lihat jumlah stok terkini untuk setiap produk dan unit. Lakukan penyesuaian stok jika diperlukan.</CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryTable />
        </CardContent>
      </Card>
    </div>
  );
}
