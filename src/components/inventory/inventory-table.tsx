
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { Edit, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import type { Product } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Placeholder for a potential stock adjustment dialog
// import { StockAdjustmentDialog } from './stock-adjustment-dialog';

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
}

const getCurrentUser = (): StoredUser | null => {
  if (typeof window !== 'undefined') {
    const storedUserStr = localStorage.getItem('mockUser');
    if (storedUserStr) {
      try {
        return JSON.parse(storedUserStr) as StoredUser;
      } catch (e) {
        console.error("Failed to parse user from localStorage in InventoryTable", e);
        return null;
      }
    }
  }
  return null;
};


export function InventoryTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustingProductUnit, setAdjustingProductUnit] = useState<{productId: string, unitName: string} | null>(null);
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const fetchProducts = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId) {
      setIsLoading(false);
      setProducts([]);
      // toast({ title: "Error", description: "Merchant information not found. Cannot load inventory.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "products"),
        where("merchantId", "==", currentUser.merchantId),
        orderBy("name", "asc") // Order by product name
      );
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products for inventory: ", error);
      toast({ title: "Fetch Failed", description: "Could not fetch inventory data.", variant: "destructive" });
      setProducts([]);
    }
    setIsLoading(false);
  }, [currentUser, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAdjustmentDialog = (productId: string, unitName: string) => {
    setAdjustingProductUnit({ productId, unitName });
    const productName = products.find(p => p.id === productId)?.name || 'Product';
    toast({ title: "Info", description: `Stock adjustment feature for ${unitName} of ${productName} is not yet implemented.`})
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading inventory data...</p>
      </div>
    );
  }

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
              const baseUnit = product.units.find(unit => unit.isBaseUnit);
              const hasDerivedUnits = product.units.some(unit => !unit.isBaseUnit && unit.conversionFactor && unit.conversionFactor > 1);

              let unitsToDisplay = product.units;

              // If a product has a base unit AND derived units, only show the base unit.
              if (baseUnit && hasDerivedUnits) {
                unitsToDisplay = product.units.filter(unit => unit.isBaseUnit);
              }
              // If no specific base unit marked but multiple units exist, show all (or could default to first, but current logic shows all if no explicit single base unit preference)
              // For simplicity with current rules: if multiple units and one is base, show base. Otherwise show all.
              // If only one unit, it's always displayed.

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
            {products.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Tidak ada produk dalam inventaris. Tambahkan produk terlebih dahulu.
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
