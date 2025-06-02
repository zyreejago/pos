
"use client";

import { useState, useEffect, useCallback } from 'react';
// import type { Metadata } from 'next'; // Metadata is not used in client components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { CalendarIcon, Download, Filter, RotateCcw, Loader2 } from "lucide-react";
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
import type { Transaction, Outlet, User } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
}

const getCurrentUserFromStorage = (): StoredUser | null => { // Renamed to avoid conflict
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

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedKasir, setSelectedKasir] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [allKasirs, setAllKasirs] = useState<User[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs once on the client after hydration
    setIsClient(true);
    setCurrentUser(getCurrentUserFromStorage());
  }, []);

  const fetchReportData = useCallback(async () => {
    if (!isClient || !currentUser || !currentUser.merchantId) {
      // Don't toast here if it's just an initial state before currentUser is loaded.
      // Toasting can cause issues if called too early or too often.
      if (isClient && currentUser && !currentUser.merchantId) {
         toast({ title: "Error", description: "Merchant information not found.", variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const merchantId = currentUser.merchantId;

      // Fetch Outlets
      const outletsQuery = query(collection(db, "outlets"), where("merchantId", "==", merchantId), orderBy("name", "asc"));
      const outletsSnapshot = await getDocs(outletsQuery);
      const fetchedOutlets: Outlet[] = outletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
      setAllOutlets(fetchedOutlets);

      // Fetch Kasirs (Users with role 'kasir')
      const kasirsQuery = query(collection(db, "users"), where("merchantId", "==", merchantId), where("role", "==", "kasir"), orderBy("name", "asc"));
      const kasirsSnapshot = await getDocs(kasirsQuery);
      const fetchedKasirs: User[] = kasirsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setAllKasirs(fetchedKasirs);
      
      // Fetch Transactions
      const transactionsQuery = query(collection(db, "transactions"), where("merchantId", "==", merchantId), orderBy("timestamp", "desc"));
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
      setFilteredTransactions(fetchedTransactions); 

    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({ title: "Fetch Failed", description: "Could not load report data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [isClient, currentUser, toast]); // Dependencies for fetchReportData callback

  useEffect(() => {
    // This effect handles data fetching and initial date range setting
    // It runs when isClient or currentUser changes.
    if (isClient && currentUser) {
      fetchReportData();
      // Initialize dateRange only once after currentUser is available and if dateRange is not already set
      if (!dateRange) { 
        setDateRange({
          from: subDays(new Date(), 7),
          to: new Date(),
        });
      }
    } else if (isClient && !currentUser) {
        // If client is ready but no user (e.g. logged out but somehow on this page)
        setIsLoading(false); // Ensure loading state is false
        setAllTransactions([]);
        setFilteredTransactions([]);
        setAllOutlets([]);
        setAllKasirs([]);
    }
  }, [isClient, currentUser, fetchReportData, dateRange]); // dateRange is included to prevent re-setting if it changes by user action


  const applyFilters = () => {
    if (isLoading) return;
    let transactions = [...allTransactions]; 

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
    if (selectedOutlet !== "all") {
      transactions = transactions.filter(t => t.outletId === selectedOutlet);
    }
    if (selectedKasir !== "all") {
      transactions = transactions.filter(t => t.kasirId === selectedKasir);
    }
    if (selectedPaymentMethod !== "all") {
      transactions = transactions.filter(t => t.paymentMethod === selectedPaymentMethod);
    }
    setFilteredTransactions(transactions);
  };
  
  const resetFilters = () => {
    if (isLoading) return; 
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    setSelectedOutlet("all");
    setSelectedKasir("all");
    setSelectedPaymentMethod("all");
    setFilteredTransactions(allTransactions);
  };

  const exportToExcel = () => {
    if (isLoading) return;
    const dataToExport = filteredTransactions.map(t => {
        const transactionDate = t.timestamp instanceof Timestamp ? t.timestamp.toDate() : new Date(t.timestamp);
        return {
            ID: t.id,
            Date: format(transactionDate, "yyyy-MM-dd HH:mm"), 
            Outlet: allOutlets.find(o => o.id === t.outletId)?.name || t.outletName || 'N/A',
            Kasir: allKasirs.find(k => k.id === t.kasirId)?.name || t.kasirName || 'N/A',
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
  
  if (isClient && currentUser && !currentUser.merchantId) {
     return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <p className="text-muted-foreground text-lg">Merchant information not found for your account.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Sales Reports</h1>
        <Button onClick={exportToExcel} variant="outline" disabled={isLoading || filteredTransactions.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export to Excel
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
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet} disabled={isLoading || allOutlets.length === 0}>
              <SelectTrigger id="outlet-filter">
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {allOutlets.map(outlet => (
                  <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kasir-filter">Kasir</Label>
            <Select value={selectedKasir} onValueChange={setSelectedKasir} disabled={isLoading || allKasirs.length === 0}>
              <SelectTrigger id="kasir-filter">
                <SelectValue placeholder="All Kasirs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kasirs</SelectItem>
                 {allKasirs.map(kasir => (
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
            <Button onClick={applyFilters} className="w-full sm:w-auto" disabled={isLoading}>
              <Filter className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
             <Button onClick={resetFilters} variant="ghost" className="w-full sm:w-auto" disabled={isLoading}>
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
                {isLoading && filteredTransactions.length === 0 ? ( // Show loading indicator in table body only if filters are applied and still loading
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
                    return (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(transactionDate, "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell>{allOutlets.find(o => o.id === transaction.outletId)?.name || transaction.outletName || 'N/A'}</TableCell>
                      <TableCell>{allKasirs.find(k => k.id === transaction.kasirId)?.name || transaction.kasirName || 'N/A'}</TableCell>
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
    