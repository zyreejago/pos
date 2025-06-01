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

// Mock data for recent sales
const mockRecentSales: Transaction[] = [
  {
    id: "txn_1",
    kasirId: "kasir_A",
    outletId: "outlet_1",
    items: [{ productId: "prod_1", productName: "Kopi Susu", unitName: "pcs", quantity: 2, pricePerUnit: 18000, totalPrice: 36000 }],
    subtotal: 36000,
    discountAmount: 0,
    ppnAmount: 3960, // 11%
    totalAmount: 39960,
    paymentMethod: "qris",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    merchantId: "merch_1",
  },
  {
    id: "txn_2",
    kasirId: "kasir_B",
    outletId: "outlet_2",
    items: [
      { productId: "prod_2", productName: "Roti Coklat", unitName: "pcs", quantity: 1, pricePerUnit: 10000, totalPrice: 10000 },
      { productId: "prod_3", productName: "Air Mineral", unitName: "pcs", quantity: 1, pricePerUnit: 5000, totalPrice: 5000 },
    ],
    subtotal: 15000,
    discountAmount: 750, // 5%
    ppnAmount: 1567.50, // 11% on (15000 - 750)
    totalAmount: 15817.50,
    paymentMethod: "cash",
    cashReceived: 20000,
    changeGiven: 4182.50,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    merchantId: "merch_1",
  },
  {
    id: "txn_3",
    kasirId: "kasir_A",
    outletId: "outlet_1",
    items: [{ productId: "prod_4", productName: "Teh Manis", unitName: "pcs", quantity: 1, pricePerUnit: 8000, totalPrice: 8000 }],
    subtotal: 8000,
    discountAmount: 0,
    ppnAmount: 880,
    totalAmount: 8880,
    paymentMethod: "qris",
    timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
    merchantId: "merch_1",
  },
];


export function RecentSalesTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-headline">Transaction ID</TableHead>
          <TableHead className="font-headline">Outlet</TableHead>
          <TableHead className="font-headline">Kasir</TableHead>
          <TableHead className="font-headline">Time</TableHead>
          <TableHead className="font-headline">Payment</TableHead>
          <TableHead className="text-right font-headline">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockRecentSales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-medium">{sale.id.substring(0,8)}...</TableCell>
            <TableCell>Outlet {sale.outletId.split('_')[1]}</TableCell>
            <TableCell>Kasir {sale.kasirId.split('_')[1]}</TableCell>
            <TableCell>{format(sale.timestamp, "PPpp")}</TableCell>
            <TableCell>
              <Badge variant={sale.paymentMethod === 'cash' ? 'secondary' : 'outline'} className="capitalize">
                {sale.paymentMethod}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(sale.totalAmount)}
            </TableCell>
          </TableRow>
        ))}
        {mockRecentSales.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No recent sales.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
