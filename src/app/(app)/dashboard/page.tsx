import type { Metadata } from 'next';
import { DollarSign, Users, CreditCard, Activity, ShoppingBag, FileText, Truck, Building } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentSalesTable } from '@/components/dashboard/recent-sales-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard - Toko App',
  description: 'Overview of your business performance.',
};

export default function DashboardPage() {
  // Placeholder data
  const totalRevenue = 12500000;
  const totalTransactions = 342;
  const newCustomers = 23;
  const averageSale = totalRevenue / totalTransactions;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Dashboard</h1>
        {/* Add date range picker or other global filters here if needed */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalRevenue)}
          icon={DollarSign}
          description="This month"
          trend="+12.5% from last month"
          trendColor="text-green-600"
        />
        <StatsCard
          title="Total Transactions"
          value={totalTransactions.toString()}
          icon={CreditCard}
          description="This month"
          trend="+8.1% from last month"
          trendColor="text-green-600"
        />
        <StatsCard
          title="Average Sale Value"
          value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(averageSale)}
          icon={Activity}
          description="This month"
        />
        <StatsCard
          title="New Customers"
          value={newCustomers.toString()}
          icon={Users}
          description="Joined this month"
          trend="-2.3% from last month"
          trendColor="text-red-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Recent Sales</CardTitle>
            <CardDescription>An overview of the latest transactions across your outlets.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSalesTable />
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
          <CardDescription>Access common tasks quickly.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <Button variant="outline" asChild className="flex flex-col h-auto p-4 items-center justify-center gap-2 text-center hover:bg-accent/50">
            <Link href="/pos">
              <DollarSign className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">New Sale (POS)</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex flex-col h-auto p-4 items-center justify-center gap-2 text-center hover:bg-accent/50">
            <Link href="/products?action=add">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Add Product</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex flex-col h-auto p-4 items-center justify-center gap-2 text-center hover:bg-accent/50">
            <Link href="/outlets?action=add">
              <Building className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Add Outlet</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex flex-col h-auto p-4 items-center justify-center gap-2 text-center hover:bg-accent/50">
            <Link href="/reports">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">View Reports</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
