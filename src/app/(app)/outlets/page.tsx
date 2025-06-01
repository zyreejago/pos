import type { Metadata } from 'next';
import { OutletsTable } from '@/components/outlets/outlets-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Outlets - Toko App',
  description: 'Manage your business outlets and locations.',
};

export default function OutletsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Outlet Management</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Your Outlets</CardTitle>
          <CardDescription>View, add, or edit your business outlets. Assign kasirs to specific outlets from the Kasir Management page.</CardDescription>
        </CardHeader>
        <CardContent>
          <OutletsTable />
        </CardContent>
      </Card>
    </div>
  );
}
