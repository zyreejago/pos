import type { Metadata } from 'next';
import { ProductsTable } from '@/components/products/products-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Products - Toko App',
  description: 'Manage your products, inventory, and pricing.',
};

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Product Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Your Products</CardTitle>
          <CardDescription>View, add, edit, or delete products in your inventory. Keep track of stock levels and pricing for different units.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsTable />
        </CardContent>
      </Card>
    </div>
  );
}
