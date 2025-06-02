
"use client"; // Ensure this component can be used within client components

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";
import { format } from 'date-fns';

interface RecentSalesTableProps {
  sales: Transaction[];
}

export function RecentSalesTable({ sales }: RecentSalesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-headline hidden md:table-cell">Transaction ID</TableHead>
          <TableHead className="font-headline">Outlet</TableHead>
          <TableHead className="font-headline hidden sm:table-cell">Kasir</TableHead>
          <TableHead className="font-headline">Time</TableHead>
          <TableHead className="font-headline hidden md:table-cell">Payment</TableHead>
          <TableHead className="text-right font-headline">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
              No recent sales to display.
            </TableCell>
          </TableRow>
        )}
        {sales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-medium hidden md:table-cell">
              {sale.id ? sale.id.substring(0,8) + '...' : 'N/A'}
            </TableCell>
            <TableCell>{sale.outletName || `Outlet ${sale.outletId.substring(0,6)}...`}</TableCell>
            <TableCell className="hidden sm:table-cell">{sale.kasirName || `Kasir ${sale.kasirId.substring(0,6)}...`}</TableCell>
            <TableCell>{sale.timestamp ? format(new Date(sale.timestamp), "PP p") : 'N/A'}</TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge variant={sale.paymentMethod === 'cash' ? 'secondary' : 'outline'} className="capitalize">
                {sale.paymentMethod}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sale.totalAmount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
