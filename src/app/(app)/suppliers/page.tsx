import type { Metadata } from 'next';
import { SuppliersTable } from '@/components/suppliers/suppliers-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Suppliers - Toko App',
  description: 'Manage your suppliers and their contact information.',
};

export default function SuppliersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Supplier Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Your Suppliers</CardTitle>
          <CardDescription>Keep track of your suppliers, manage their details, and link them to products.</CardDescription>
        </CardHeader>
        <CardContent>
          <SuppliersTable />
        </CardContent>
      </Card>
    </div>
  );
}
