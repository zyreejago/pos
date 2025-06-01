
"use client";

import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
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
import { CalendarIcon, Download, Filter, RotateCcw } from "lucide-react";
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


// Mock data for outlets and kasirs (can remain top-level as they don't use new Date())
const mockOutlets: Outlet[] = [
  { id: "outlet_1", name: "Main Outlet", address: "Jl. Sudirman No. 123", merchantId: "merch_1" },
  { id: "outlet_2", name: "Branch Kemang", address: "Jl. Kemang Raya No. 45", merchantId: "merch_1" },
];
const mockKasirs: User[] = [
  { id: "kasir_1", name: "Andi Setiawan", email: "", role:"kasir", status: "active" },
  { id: "kasir_2", name: "Bunga Citra", email: "", role: "kasir", status: "active" },
];


export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedKasir, setSelectedKasir] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  
  const [clientSideMockTransactions, setClientSideMockTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Generate mock transactions on the client side
    const initialMockTransactions: Transaction[] = [
      { id: "txn_001", outletId: "outlet_1", kasirId: "kasir_1", timestamp: subDays(new Date(), 1), totalAmount: 150000, paymentMethod: "cash", items:[], subtotal:0, discountAmount:0, ppnAmount:0, merchantId: "merch_1" },
      { id: "txn_002", outletId: "outlet_2", kasirId: "kasir_2", timestamp: subDays(new Date(), 2), totalAmount: 250000, paymentMethod: "qris", items:[], subtotal:0, discountAmount:0, ppnAmount:0, merchantId: "merch_1" },
      { id: "txn_003", outletId: "outlet_1", kasirId: "kasir_1", timestamp: subDays(new Date(), 0), totalAmount: 80000, paymentMethod: "cash", items:[], subtotal:0, discountAmount:0, ppnAmount:0, merchantId: "merch_1" },
    ];
    setClientSideMockTransactions(initialMockTransactions);
    setFilteredTransactions(initialMockTransactions);

    // Initialize dateRange on the client side
    setDateRange({
      from: subDays(new Date(), 7),
      to: new Date(),
    });

    setIsLoading(false);
  }, []); // Empty dependency array ensures this runs once on mount

  const applyFilters = () => {
    if (isLoading) return;
    let transactions = clientSideMockTransactions;
    if (dateRange?.from && dateRange?.to) {
      transactions = transactions.filter(t => new Date(t.timestamp) >= dateRange.from! && new Date(t.timestamp) <= dateRange.to!);
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
    setFilteredTransactions(clientSideMockTransactions);
  };

  const exportToExcel = () => {
    if (isLoading) return;
    const dataToExport = filteredTransactions.map(t => ({
      ID: t.id,
      Date: format(t.timestamp, "yyyy-MM-dd HH:mm"), // Corrected format call
      Outlet: mockOutlets.find(o => o.id === t.outletId)?.name || 'N/A',
      Kasir: mockKasirs.find(k => k.id === t.kasirId)?.name || 'N/A',
      'Payment Method': t.paymentMethod,
      Total: t.totalAmount,
    }));
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(dataToExport[0] || {}).join(",") + "\n"
      + dataToExport.map(e => Object.values(e).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[calc(100vh-theme(spacing.28))]">
        <p className="text-muted-foreground text-lg">Loading report data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">Sales Reports</h1>
        <Button onClick={exportToExcel} variant="outline">
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
                  disabled={!dateRange} // Disable if dateRange is not yet initialized
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
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="outlet-filter">Outlet</Label>
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger id="outlet-filter">
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {mockOutlets.map(outlet => (
                  <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kasir-filter">Kasir</Label>
            <Select value={selectedKasir} onValueChange={setSelectedKasir}>
              <SelectTrigger id="kasir-filter">
                <SelectValue placeholder="All Kasirs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kasirs</SelectItem>
                 {mockKasirs.map(kasir => (
                  <SelectItem key={kasir.id} value={kasir.id}>{kasir.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method-filter">Payment Method</Label>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger id="payment-method-filter">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                {/* Add other payment methods as needed */}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={applyFilters} className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
             <Button onClick={resetFilters} variant="ghost" className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Report Results</CardTitle>
          <CardDescription>Showing {filteredTransactions.length} transactions based on your filters.</CardDescription>
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
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(transaction.timestamp, "dd MMM yyyy, HH:mm")}</TableCell> {/* Corrected format call */}
                      <TableCell>{mockOutlets.find(o => o.id === transaction.outletId)?.name || 'N/A'}</TableCell>
                      <TableCell>{mockKasirs.find(k => k.id === transaction.kasirId)?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.paymentMethod === 'cash' ? 'secondary' : 'outline'} className="capitalize">
                            {transaction.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaction.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
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


    