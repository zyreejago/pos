'use client';

import type { Metadata } from 'next';
import { Users, CreditCard, Activity, ShoppingBag, FileText, Truck, Building, Loader2, TrendingUp, RotateCcw } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentSalesTable } from '@/components/dashboard/recent-sales-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Transaction as FirestoreTransaction, User as StoredUserType, Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, format, isSameDay } from 'date-fns';
import type { SVGProps } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Komponen kustom untuk ikon Rupiah yang kompatibel dengan LucideIcon
const RupiahIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => {
  return (
    <svg
      ref={ref}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <text x="4" y="16" fontSize="12" fontWeight="bold">Rp</text>
    </svg>
  );
});

RupiahIcon.displayName = 'RupiahIcon';

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

interface ResetState {
  isReset: boolean;
  timestamp: string;
  outletId?: string;
  merchantId?: string;
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
  const [totalProfit, setTotalProfit] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isClient, setIsClient] = useState(false);
  const [isReset, setIsReset] = useState(false);

  // Function to get reset key based on user context
  const getResetKey = useCallback(() => {
    if (currentUser?.role === 'kasir' && selectedOutlet) {
      return `dashboardReset_${selectedOutlet.id}`;
    } else if (currentUser?.merchantId) {
      return `dashboardReset_${currentUser.merchantId}`;
    }
    return 'dashboardReset_default';
  }, [currentUser, selectedOutlet]);

  // Check if reset is active on component mount
  useEffect(() => {
    if (isClient && currentUser) {
      const resetKey = getResetKey();
      const savedReset = localStorage.getItem(resetKey);
      
      if (savedReset) {
        try {
          const resetData: ResetState = JSON.parse(savedReset);
          const resetDate = new Date(resetData.timestamp);
          const today = new Date();
          
          // Check if reset is still valid (same day)
          if (isSameDay(resetDate, today)) {
            setIsReset(true);
            console.log('Reset masih aktif untuk hari ini');
          } else {
            // Reset expired, remove from localStorage
            localStorage.removeItem(resetKey);
            setIsReset(false);
            console.log('Reset sudah expired, dihapus dari localStorage');
          }
        } catch (error) {
          console.error('Error parsing reset data:', error);
          localStorage.removeItem(resetKey);
          setIsReset(false);
        }
      } else {
        setIsReset(false);
      }
    }
  }, [isClient, currentUser, selectedOutlet, getResetKey]);

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

  const fetchProducts = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId) {
      setProducts([]);
      return;
    }

    try {
      const q = query(
        collection(db, "products"),
        where("merchantId", "==", currentUser.merchantId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(fetchedProducts);

    } catch (error: any) {
      console.error("Error fetching products: ", error);
      toast({ title: "Product Fetch Failed", description: `Could not fetch products data. ${error.message}`, variant: "destructive" });
      setProducts([]);
    }
  }, [currentUser, toast]);

  const fetchDashboardData = useCallback(async () => {
    // If reset is active, don't fetch data
    if (isReset) {
      setIsLoading(false);
      setTransactions([]);
      setRecentSales([]);
      setTotalRevenue(0);
      setTotalTransactionsCount(0);
      setActiveKasirsCount(0);
      setTotalProfit(0);
      return;
    }

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
      // Fetch all transactions for profit calculation (not limited by month)
      let allTransactionsQueryConstraints = [
        where("merchantId", "==", currentUser.merchantId)
      ];

      if (currentUser.role === 'kasir' && selectedOutlet?.id) {
        allTransactionsQueryConstraints.push(where("outletId", "==", selectedOutlet.id));
      }
      
      const allTransactionsQuery = query(collection(db, "transactions"), ...allTransactionsQueryConstraints, orderBy("timestamp", "desc"));
      const allTransactionsSnapshot = await getDocs(allTransactionsQuery);
      
      const allFetchedTransactions: FirestoreTransaction[] = [];
      let cumulativeProfit = 0;
      
      allTransactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const transaction = { 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp) 
        } as FirestoreTransaction;
        
        allFetchedTransactions.push(transaction);
        
        // Calculate profit for each transaction
        // Assuming each transaction item has productId, quantity, pricePerUnit
        // We need to find the corresponding product's cost price
        transaction.items.forEach(item => {
          // Find the product
          const product = products.find(p => p.id === item.productId);
          if (product) {
            // Find the unit
            const unit = product.units.find(u => u.name === item.unitName);
            if (unit && unit.costPrice) {
              // Calculate profit: (selling price - cost price) * quantity
              const itemProfit = (item.pricePerUnit - unit.costPrice) * item.quantity;
              cumulativeProfit += itemProfit;
            }
          }
        });
      });
      
      // Set the cumulative profit
      setTotalProfit(cumulativeProfit);

      // Now fetch transactions for the current month for other dashboard stats
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
  }, [currentUser, selectedOutlet, toast, products, isReset]);

  const resetCalculations = () => {
    const resetKey = getResetKey();
    const resetState: ResetState = {
      isReset: true,
      timestamp: new Date().toISOString(),
      outletId: selectedOutlet?.id,
      merchantId: currentUser?.merchantId
    };
    
    // Save reset state to localStorage
    localStorage.setItem(resetKey, JSON.stringify(resetState));
    
    // Set reset flag
    setIsReset(true);
    
    // Reset all state values
    setTotalRevenue(0);
    setTotalTransactionsCount(0);
    setActiveKasirsCount(0);
    setTotalProfit(0);
    setRecentSales([]);
    setTransactions([]);
    
    toast({
      title: "Perhitungan Direset Permanent",
      description: "Semua data perhitungan dashboard telah direset ke nol dan akan bertahan hingga hari berganti.",
      variant: "default"
    });
  };

  useEffect(() => {
    if (isClient && currentUser) {
        // Only fetch if currentUser is loaded and has a merchantId,
        // or if superadmin (who doesn't have a merchantId relevant for this dashboard).
        // For superadmin, this dashboard might not be relevant or show aggregate data (not implemented here).
        if (currentUser.merchantId || currentUser.role === 'admin') { // Admins always have merchantId
             fetchProducts();
        } else if (currentUser.role === 'kasir' && selectedOutlet) {
             fetchProducts();
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
  }, [isClient, currentUser, selectedOutlet, fetchProducts, toast]);

  // After products are loaded, fetch dashboard data
  useEffect(() => {
    if (products.length > 0 || (isClient && currentUser)) {
      fetchDashboardData();
    }
  }, [products, isClient, currentUser, fetchDashboardData]);

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
            {isReset && <span className="text-sm text-orange-600 ml-2">(Reset Aktif)</span>}
        </h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {isReset ? 'Reset Sudah Aktif' : 'Reset Perhitungan'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Reset Perhitungan</AlertDialogTitle>
              <AlertDialogDescription>
                {isReset ? (
                  "Reset sudah aktif untuk hari ini. Apakah Anda ingin mereset ulang?"
                ) : (
                  "Apakah Anda yakin ingin mereset semua perhitungan dashboard? Tindakan ini akan mengatur ulang semua data statistik ke nol dan akan bertahan hingga hari berganti."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={resetCalculations} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isReset ? 'Reset Ulang' : 'Ya, Reset'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Add date range picker or other global filters here if needed */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total Revenue"
          value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue)}
          icon={RupiahIcon}
          description={`This month (${format(new Date(), 'MMMM yyyy')})`}
        />
        <StatsCard
          title="Total Profit"
          value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalProfit)}
          icon={TrendingUp}
          description={`Laba dari selisih harga jual dan beli`}
          trendColor={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}
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
              <RupiahIcon className="h-8 w-8 text-primary" />
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