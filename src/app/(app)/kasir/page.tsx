import type { Metadata } from 'next';
import { KasirTable } from '@/components/kasir/kasir-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Manage Kasir - Toko App',
  description: 'Manage kasir accounts and their outlet access.',
};

export default function ManageKasirPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Kasir Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Kasir Accounts</CardTitle>
          <CardDescription>Add new kasirs, edit their details, manage passwords, and assign outlet access.</CardDescription>
        </CardHeader>
        <CardContent>
          <KasirTable />
        </CardContent>
      </Card>
    </div>
  );
}
