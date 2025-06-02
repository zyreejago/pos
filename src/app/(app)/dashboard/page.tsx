
"use client";

import type { Metadata } from 'next';
import { DollarSign, Users, CreditCard, Activity, ShoppingBag, FileText, Truck, Building, Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentSalesTable } from '@/components/dashboard/recent-sales-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Transaction as FirestoreTransaction, User as StoredUserType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Metadata can be defined statically if 'use client' is used, but it's better managed in layout or page for server components.
// For client components, dynamic titles can be set using document.title if needed.
// export const metadata: Metadata = {
//   title: 'Dashboard - Toko App',
//   description: 'Overview of your business performance.',
// };

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
  status?: 'active' | 'pending_approval' | 'inactive';
}

interface SelectedOutlet {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<SelectedOutlet | null>(null);
  const [transactions, setTransactions] = useState<FirestoreTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactionsCount, setTotalTransactionsCount] = useState(0);
  const [activeKasirsCount, setActiveKasirsCount] = useState(0);
  const [recentSales, setRecentSales] = useState<FirestoreTransaction[]>([]);
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('mockUser');
      const outletIdStr = localStorage.getItem('selectedOutletId');
      const outletNameStr = localStorage.getItem('selectedOutletName');

      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setCurrentUser(parsedUser);
        if (parsedUser.role === 'superadmin') {
           // Superadmin shouldn't be on this dashboard, redirect or show different view
           // For now, we'll let it load but data might be empty if merchantId isn't applicable
        }
      } else {
        toast({ title: "User Error", description: "User not identified. Please re-login.", variant: "destructive" });
      }

      if (outletIdStr && outletNameStr) {
        setSelectedOutlet({ id: outletIdStr, name: outletNameStr });
      } else {
        if (userStr && JSON.parse(userStr).role !== 'superadmin' && JSON.parse(userStr).role !== 'admin') {
           toast({ title: "Outlet Error", description: "Outlet not selected. Please select an outlet.", variant: "destructive" });
        }
      }
    }
  }, [toast]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId) {
      setIsLoading(false);
      setTransactions([]);
      setRecentSales([]);
      setTotalRevenue(0);
      setTotalTransactionsCount(0);
      setActiveKasirsCount(0);
      return;
    }
    setIsLoading(true);

    try {
      const now = new Date();
      const firstDayOfMonth = startOfMonth(now);
      const lastDayOfMonth = endOfMonth(now);

      let transactionsQueryConstraints = [
        where("merchantId", "==", currentUser.merchantId),
        where("timestamp", ">=", Timestamp.fromDate(firstDayOfMonth)),
        where("timestamp", "<=", Timestamp.fromDate(lastDayOfMonth))
      ];

      if (currentUser.role === 'kasir' && selectedOutlet?.id) {
        transactionsQueryConstraints.push(where("outletId", "==", selectedOutlet.id));
      }
      
      const q = query(collection(db, "transactions"), ...transactionsQueryConstraints, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedTransactions: FirestoreTransaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTransactions.push({ 
            id: doc.id, 
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp) 
        } as FirestoreTransaction);
      });
      
      setTransactions(fetchedTransactions);

      // Calculate stats
      let revenue = 0;
      const kasirIdsThisMonth = new Set<string>();
      fetchedTransactions.forEach(t => {
        revenue += t.totalAmount;
        if (t.kasirId) kasirIdsThisMonth.add(t.kasirId);
      });

      setTotalRevenue(revenue);
      setTotalTransactionsCount(fetchedTransactions.length);
      setActiveKasirsCount(kasirIdsThisMonth.size);
      setRecentSales(fetchedTransactions.slice(0, 5)); // Get 5 most recent for the table

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Data Load Failed", description: `Could not load dashboard data: ${error.message}`, variant: "destructive" });
      setTransactions([]);
      setRecentSales([]);
    }
    setIsLoading(false);
  }, [currentUser, selectedOutlet, toast]);

  useEffect(() => {
    if (isClient && currentUser) {
        // Only fetch if currentUser is loaded and has a merchantId,
        // or if superadmin (who doesn't have a merchantId relevant for this dashboard).
        // For superadmin, this dashboard might not be relevant or show aggregate data (not implemented here).
        if (currentUser.merchantId || currentUser.role === 'admin') { // Admins always have merchantId
             fetchDashboardData();
        } else if (currentUser.role === 'kasir' && selectedOutlet) {
             fetchDashboardData();
        } else if (currentUser.role === 'superadmin') {
            setIsLoading(false); // Superadmin doesn't have typical merchant data
            setTotalRevenue(0);
            setTotalTransactionsCount(0);
            setActiveKasirsCount(0);
            setRecentSales([]);
             toast({ title: "Superadmin View", description: "Dashboard data is merchant-specific. No data to display for superadmin here.", variant: "default"});
        } else {
            setIsLoading(false); // If kasir but no outlet selected, or other unhandled cases
        }
    } else if (isClient && !currentUser) {
        setIsLoading(false); // No user, stop loading
    }
  }, [isClient, currentUser, selectedOutlet, fetchDashboardData, toast]);


  const averageSale = totalTransactionsCount > 0 ? totalRevenue / totalTransactionsCount : 0;

  if (!isClient || isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-lg">
                {!isClient ? "Initializing Dashboard..." : "Loading dashboard data..."}
            </p>
        </div>
    );
  }
  
  if (isClient && currentUser?.role === 'superadmin') {
    return (
      <div className="flex flex-col gap-6 md:gap-8 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Superadmin Dashboard</h1>
        <p className="text-muted-foreground">This dashboard displays merchant-specific data. Please navigate to User Management.</p>
        <Button asChild>
          <Link href="/admin/users">Go to User Management</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">
            Dashboard {currentUser?.role === 'kasir' && selectedOutlet ? `- ${selectedOutlet.name}` : ''}
        </h1>
        {/* Add date range picker or other global filters here if needed */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue)}
          icon={DollarSign}
          description={`This month (${format(new Date(), 'MMMM yyyy')})`}
        />
        <StatsCard
          title="Total Transactions"
          value={totalTransactionsCount.toString()}
          icon={CreditCard}
          description={`This month (${format(new Date(), 'MMMM yyyy')})`}
        />
        <StatsCard
          title="Average Sale Value"
          value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(averageSale)}
          icon={Activity}
          description={`This month (${format(new Date(), 'MMMM yyyy')})`}
        />
        <StatsCard
          title="Active Kasirs"
          value={activeKasirsCount.toString()}
          icon={Users}
          description={`Kasirs with sales this month`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Recent Sales</CardTitle>
            <CardDescription>
              An overview of the latest transactions {currentUser?.role === 'kasir' && selectedOutlet ? `for ${selectedOutlet.name}` : 'across your outlets'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSalesTable sales={recentSales} />
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
          {currentUser?.role !== 'kasir' && ( // Kasirs usually don't add products/outlets
            <>
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
            </>
          )}
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
