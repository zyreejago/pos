
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, Filter, RotateCcw, Loader2, Store } from "lucide-react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction, Outlet, User as FirestoreUserType } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: 'admin' | 'kasir' | 'superadmin';
  merchantId?: string;
}

interface StoredOutlet {
    id: string;
    name: string;
}

const getCurrentUserFromStorage = (): StoredUser | null => {
  if (typeof window !== 'undefined') {
    const storedUserStr = localStorage.getItem('mockUser');
    if (storedUserStr) {
      try {
        return JSON.parse(storedUserStr) as StoredUser;
      } catch (e) {
        console.error("Failed to parse user from localStorage in ReportsPage", e);
        return null;
      }
    }
  }
  return null;
};

const getSelectedOutletFromStorage = (): StoredOutlet | null => {
    if (typeof window !== 'undefined') {
        const outletId = localStorage.getItem('selectedOutletId');
        const outletName = localStorage.getItem('selectedOutletName');
        if (outletId && outletName) {
            return { id: outletId, name: outletName };
        }
    }
    return null;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>("all"); // For admin filter
  const [selectedKasirFilter, setSelectedKasirFilter] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allMerchantOutlets, setAllMerchantOutlets] = useState<Outlet[]>([]); // Outlets for admin to filter by
  const [allMerchantKasirs, setAllMerchantKasirs] = useState<FirestoreUserType[]>([]); // Kasirs for admin to filter by
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [kasirSelectedOutlet, setKasirSelectedOutlet] = useState<StoredOutlet | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const user = getCurrentUserFromStorage();
    setCurrentUser(user);
    if (user?.role === 'kasir') {
        const outlet = getSelectedOutletFromStorage();
        setKasirSelectedOutlet(outlet);
        if (outlet) {
            setSelectedOutletFilter(outlet.id); // Lock filter for kasir
        }
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    if (!isClient || !currentUser || !currentUser.merchantId) {
      if (isClient && currentUser && !currentUser.merchantId && currentUser.role !== 'superadmin') {
         toast({ title: "Error", description: "Merchant information not found.", variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const merchantId = currentUser.merchantId;

      // Fetch Outlets (only if admin, kasir uses their single selected outlet)
      if (currentUser.role === 'admin') {
        const outletsQuery = query(collection(db, "outlets"), where("merchantId", "==", merchantId), orderBy("name", "asc"));
        const outletsSnapshot = await getDocs(outletsQuery);
        const fetchedOutlets: Outlet[] = outletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
        setAllMerchantOutlets(fetchedOutlets);
      } else if (currentUser.role === 'kasir' && kasirSelectedOutlet) {
        setAllMerchantOutlets([{id: kasirSelectedOutlet.id, name: kasirSelectedOutlet.name, merchantId: merchantId, address: ''}]); // Mock structure for consistency
      }

      // Fetch Kasirs (Users with role 'kasir' for this merchant)
      if (currentUser.role === 'admin') { // Only admin can filter by kasir
        const kasirsQuery = query(collection(db, "users"), where("merchantId", "==", merchantId), where("role", "==", "kasir"), orderBy("name", "asc"));
        const kasirsSnapshot = await getDocs(kasirsQuery);
        const fetchedKasirs: FirestoreUserType[] = kasirsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreUserType));
        setAllMerchantKasirs(fetchedKasirs);
      }
      
      // Build Transactions Query
      let transactionsQueryConstraints = [
        where("merchantId", "==", merchantId),
        orderBy("timestamp", "desc")
      ];

      // Apply initial filters based on role
      if (currentUser.role === 'kasir' && kasirSelectedOutlet?.id) {
        transactionsQueryConstraints.push(where("outletId", "==", kasirSelectedOutlet.id));
      }
      // Date range is applied in applyFilters or initial fetch if needed immediately

      const transactionsQuery = query(collection(db, "transactions"), ...transactionsQueryConstraints);
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const fetchedTransactions: Transaction[] = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp) 
        } as Transaction;
      });
      setAllTransactions(fetchedTransactions);
      // Apply current filters to fetched transactions
      applyFilters(fetchedTransactions); 

    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({ title: "Fetch Failed", description: `Could not load report data: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [isClient, currentUser, toast, kasirSelectedOutlet]); // Dependencies for fetchReportData callback

  useEffect(() => {
    if (isClient && currentUser) {
      fetchReportData();
    } else if (isClient && !currentUser) {
        setIsLoading(false);
        setAllTransactions([]);
        setFilteredTransactions([]);
        setAllMerchantOutlets([]);
        setAllMerchantKasirs([]);
    }
  }, [isClient, currentUser, fetchReportData]);


  const applyFilters = (sourceTransactions: Transaction[] = allTransactions) => {
    if (isLoading && !sourceTransactions.length) return; // Prevent filtering if still loading initial data
    let transactions = [...sourceTransactions]; 

    if (dateRange?.from) {
        transactions = transactions.filter(t => {
            const transactionDate = t.timestamp instanceof Timestamp ? t.timestamp.toDate() : new Date(t.timestamp);
            return transactionDate >= dateRange.from!;
        });
    }
    if (dateRange?.to) {
        transactions = transactions.filter(t => {
            const transactionDate = t.timestamp instanceof Timestamp ? t.timestamp.toDate() : new Date(t.timestamp);
            const toDateEnd = new Date(dateRange.to!);
            toDateEnd.setHours(23, 59, 59, 999);
            return transactionDate <= toDateEnd;
        });
    }

    // Outlet filter: respects kasir's fixed outlet or admin's selection
    if (currentUser?.role === 'kasir' && kasirSelectedOutlet?.id) {
        transactions = transactions.filter(t => t.outletId === kasirSelectedOutlet.id);
    } else if (selectedOutletFilter !== "all") {
      transactions = transactions.filter(t => t.outletId === selectedOutletFilter);
    }

    if (selectedKasirFilter !== "all" && currentUser?.role !== 'kasir') { // Kasirs don't filter by other kasirs
      transactions = transactions.filter(t => t.kasirId === selectedKasirFilter);
    }
    if (selectedPaymentMethod !== "all") {
      transactions = transactions.filter(t => t.paymentMethod === selectedPaymentMethod);
    }
    setFilteredTransactions(transactions);
  };
  
  // Trigger applyFilters when filter states change
  useEffect(() => {
    if (!isLoading) { // Only apply if not initially loading
        applyFilters();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedOutletFilter, selectedKasirFilter, selectedPaymentMethod, allTransactions, isLoading]);


  const resetFilters = () => {
    if (isLoading) return; 
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    if (currentUser?.role !== 'kasir') { // Kasir's outlet filter is fixed
      setSelectedOutletFilter("all");
    }
    setSelectedKasirFilter("all");
    setSelectedPaymentMethod("all");
    // applyFilters will be called by its own useEffect
  };

  const exportToExcel = () => {
    if (isLoading) return;
    const dataToExport = filteredTransactions.map(t => {
        const transactionDate = t.timestamp instanceof Timestamp ? t.timestamp.toDate() : new Date(t.timestamp);
        return {
            ID: t.id,
            Date: format(transactionDate, "yyyy-MM-dd HH:mm"), 
            Outlet: allMerchantOutlets.find(o => o.id === t.outletId)?.name || t.outletName || 'N/A',
            Kasir: allMerchantKasirs.find(k => k.id === t.kasirId)?.name || t.kasirName || (currentUser?.role === 'kasir' ? currentUser.displayName : 'N/A'),
            'Payment Method': t.paymentMethod,
            Total: t.totalAmount,
        };
    });

    if (dataToExport.length === 0) {
        toast({ title: "No Data", description: "No data to export based on current filters.", variant: "default"});
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(dataToExport[0]).join(",") + "\n"
      + dataToExport.map(e => Object.values(e).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Sales report has been downloaded as CSV.", variant: "default" });
  };

  if (!isClient || (isLoading && !currentUser)) { 
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-lg">{!isClient ? "Initializing..." : "Loading user data..."}</p>
      </div>
    );
  }
  
  if (isClient && !currentUser) {
     return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <p className="text-muted-foreground text-lg">User not authenticated. Please log in.</p>
      </div>
    );
  }
  
  if (isClient && currentUser && !currentUser.merchantId && currentUser.role !== 'superadmin') {
     return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <p className="text-muted-foreground text-lg">Merchant information not found for your account.</p>
      </div>
    );
  }
  
  if (isClient && currentUser?.role === 'superadmin') {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Reports (Superadmin)</h1>
        <p className="text-muted-foreground">Reports are merchant-specific. No data to display for superadmin here.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">
            Sales Reports {currentUser?.role === 'kasir' && kasirSelectedOutlet ? `- ${kasirSelectedOutlet.name}` : ''}
        </h1>
        <Button onClick={exportToExcel} variant="outline" disabled={isLoading || filteredTransactions.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export to CSV
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Filter Report Data</CardTitle>
          <CardDescription>Select criteria to generate your sales report.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="date-range">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                  disabled={isLoading} 
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  disabled={isLoading}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="outlet-filter">Outlet</Label>
            {currentUser?.role === 'kasir' && kasirSelectedOutlet ? (
                 <Input 
                    value={kasirSelectedOutlet.name} 
                    disabled 
                    className="w-full [&_svg]:hidden" 
                    prependIcon={<Store className="h-4 w-4 text-muted-foreground mr-2"/>}
                 />
            ) : (
                <Select 
                    value={selectedOutletFilter} 
                    onValueChange={setSelectedOutletFilter} 
                    disabled={isLoading || allMerchantOutlets.length === 0 || currentUser?.role === 'kasir'}
                >
                <SelectTrigger id="outlet-filter">
                    <SelectValue placeholder="All Outlets" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Outlets</SelectItem>
                    {allMerchantOutlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="kasir-filter">Kasir</Label>
            <Select 
                value={selectedKasirFilter} 
                onValueChange={setSelectedKasirFilter} 
                disabled={isLoading || allMerchantKasirs.length === 0 || currentUser?.role === 'kasir'}
            >
              <SelectTrigger id="kasir-filter">
                <SelectValue placeholder="All Kasirs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kasirs</SelectItem>
                 {allMerchantKasirs.map(kasir => (
                  <SelectItem key={kasir.id} value={kasir.id}>{kasir.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method-filter">Payment Method</Label>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} disabled={isLoading}>
              <SelectTrigger id="payment-method-filter">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {/* Apply Filters button is removed as filters apply automatically on change via useEffect */}
             <Button onClick={resetFilters} variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Report Results</CardTitle>
          <CardDescription>Showing {filteredTransactions.length} transactions based on your filters. Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0))}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && filteredTransactions.length === 0 && !allTransactions.length ? ( 
                   <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading transactions...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => {
                    const transactionDate = transaction.timestamp instanceof Timestamp ? transaction.timestamp.toDate() : new Date(transaction.timestamp);
                    const outletDisplay = currentUser?.role === 'kasir' && kasirSelectedOutlet ? kasirSelectedOutlet.name : (allMerchantOutlets.find(o => o.id === transaction.outletId)?.name || transaction.outletName || 'N/A');
                    const kasirDisplay = currentUser?.role === 'kasir' ? currentUser.displayName : (allMerchantKasirs.find(k => k.id === transaction.kasirId)?.name || transaction.kasirName || 'N/A');
                    return (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(transactionDate, "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell>{outletDisplay}</TableCell>
                      <TableCell>{kasirDisplay}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.paymentMethod === 'cash' ? 'secondary' : 'outline'} className="capitalize">
                            {transaction.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaction.totalAmount)}
                      </TableCell>
                    </TableRow>
                  );
                })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No transactions match your current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
