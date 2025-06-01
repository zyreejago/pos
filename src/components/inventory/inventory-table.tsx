
"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, TrendingUp, TrendingDown } from "lucide-react";
import type { Product, Supplier } from "@/types"; // Assuming Product type is relevant
import { useToast } from "@/hooks/use-toast";
// Placeholder for a potential stock adjustment dialog
// import { StockAdjustmentDialog } from './stock-adjustment-dialog';

// Temporary mock data, ideally this should come from a shared localStorage source
const mockProductsData: Product[] = [
  {
    id: "prod_1",
    name: "Kopi Susu Gula Aren",
    barcode: "8991234567890",
    supplierId: "sup_1",
    buyOwn: false,
    units: [{ name: "pcs", price: 18000, stock: 50, isBaseUnit: true }],
    merchantId: "merch_1",
  },
  {
    id: "prod_2",
    name: "Roti Coklat Keju",
    units: [
        { name: "pcs", price: 10000, stock: 100, isBaseUnit: true },
        { name: "lusin", price: 110000, stock: 8, conversionFactor: 12 }
    ],
    merchantId: "merch_1",
  },
  {
    id: "prod_3",
    name: "Air Mineral Botol",
    barcode: "8990000111222",
    supplierId: "sup_2",
    units: [
        { name: "botol", price: 5000, stock: 200, isBaseUnit: true },
        { name: "dus", price: 90000, stock: 15, conversionFactor: 24 }
    ],
    merchantId: "merch_1",
  },
   { id: 'prod_4', name: 'Teh Manis Hangat', units: [{name: 'pcs', price: 8000, stock: 70, isBaseUnit: true}], merchantId: 'merch_1' },
   { id: 'prod_5', name: 'Nasi Goreng Spesial', units: [{name: 'pcs', price: 25000, stock: 30, isBaseUnit: true}], merchantId: 'merch_1' },
   { id: 'prod_6', name: 'Kentang Goreng', units: [{name: 'pcs', price: 15000, stock: 60, isBaseUnit: true}], merchantId: 'merch_1' },
];


export function InventoryTable() {
  const [products, setProducts] = useState<Product[]>(mockProductsData);
  const [adjustingProductUnit, setAdjustingProductUnit] = useState<{productId: string, unitName: string} | null>(null);
  const { toast } = useToast();

  const handleOpenAdjustmentDialog = (productId: string, unitName: string) => {
    setAdjustingProductUnit({ productId, unitName });
    toast({ title: "Info", description: `Fitur penyesuaian stok untuk ${unitName} produk ${productId} belum diimplementasikan.`})
  };

  return (
    <>
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline">Nama Produk</TableHead>
              <TableHead className="font-headline">Unit</TableHead>
              <TableHead className="font-headline text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-center font-headline">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const hasBaseUnit = product.units.some(unit => unit.isBaseUnit);
              const hasDerivedUnit = product.units.some(unit => !unit.isBaseUnit && unit.conversionFactor && unit.conversionFactor > 1);

              let unitsToDisplay = product.units;
              if (hasBaseUnit && hasDerivedUnit) {
                unitsToDisplay = product.units.filter(unit => unit.isBaseUnit);
              }
              
              return unitsToDisplay.map((unit, displayUnitIndex) => (
                <TableRow key={`${product.id}-${unit.name}`}>
                  {displayUnitIndex === 0 ? (
                    <TableCell rowSpan={unitsToDisplay.length} className="font-medium align-top py-3">
                      {product.name}
                    </TableCell>
                  ) : null}
                  <TableCell className="py-3">{unit.name}</TableCell>
                  <TableCell className="text-right py-3">{unit.stock}</TableCell>
                  <TableCell className="text-center py-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenAdjustmentDialog(product.id, unit.name)}
                    >
                      <Edit className="mr-2 h-3 w-3" /> Sesuaikan Stok
                    </Button>
                  </TableCell>
                </TableRow>
              ));
            })}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Tidak ada produk untuk ditampilkan. Tambahkan produk terlebih dahulu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* 
      {adjustingProductUnit && (
        <StockAdjustmentDialog
          productName={products.find(p => p.id === adjustingProductUnit.productId)?.name || ''}
          unitName={adjustingProductUnit.unitName}
          currentStock={
            products.find(p => p.id === adjustingProductUnit.productId)?.units.find(u => u.name === adjustingProductUnit.unitName)?.stock || 0
          }
          onSave={(newStock, reason) => handleStockAdjustment(adjustingProductUnit.productId, adjustingProductUnit.unitName, newStock, reason)}
          onClose={() => setAdjustingProductUnit(null)}
        />
      )}
      */}
    </>
  );
}
