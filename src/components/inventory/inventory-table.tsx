
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
import { Edit, Loader2 } from "lucide-react";
import type { Product } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { db, serverTimestamp } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { StockAdjustmentDialog } from './stock-adjustment-dialog'; // Import the new dialog

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
}

const getCurrentUserFromStorage = (): StoredUser | null => {
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
  const { toast } = useToast();
  
  const [localCurrentUser, setLocalCurrentUser] = useState<StoredUser | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustingItemDetails, setAdjustingItemDetails] = useState<{
    productId: string;
    productName: string;
    unitName: string;
    currentStock: number;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
    setLocalCurrentUser(getCurrentUserFromStorage());
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!localCurrentUser || !localCurrentUser.merchantId) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "products"),
        where("merchantId", "==", localCurrentUser.merchantId),
        orderBy("name", "asc")
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
  }, [localCurrentUser, toast]);

  useEffect(() => {
    if (isClient) {
      if (localCurrentUser && localCurrentUser.merchantId) {
        fetchProducts();
      } else {
        setIsLoading(false);
        setProducts([]);
      }
    }
  }, [isClient, localCurrentUser, fetchProducts]);

  const handleOpenAdjustmentDialog = (productId: string, productName: string, unitName: string, currentStock: number) => {
    setAdjustingItemDetails({ productId, productName, unitName, currentStock });
    setIsAdjustmentDialogOpen(true);
  };

  const handleStockAdjustment = async (newStock: number, reason?: string) => {
    if (!adjustingItemDetails || !localCurrentUser?.merchantId) {
      toast({ title: "Error", description: "Cannot adjust stock. Missing details or user info.", variant: "destructive" });
      return;
    }

    const { productId, unitName: unitNameToAdjust, productName } = adjustingItemDetails;

    try {
      const productRef = doc(db, "products", productId);
      const productToUpdate = products.find(p => p.id === productId);

      if (!productToUpdate) {
        toast({ title: "Error", description: `Product ${productName} not found.`, variant: "destructive" });
        return;
      }

      const updatedUnits = productToUpdate.units.map(unit => {
        if (unit.name === unitNameToAdjust) {
          return { ...unit, stock: newStock };
        }
        return unit;
      });

      await updateDoc(productRef, {
        units: updatedUnits,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Stock Adjusted",
        description: `Stock for ${productName} (${unitNameToAdjust}) updated to ${newStock}. Reason: ${reason || 'N/A'}`,
      });
      fetchProducts(); // Refresh the product list
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({ title: "Adjustment Failed", description: `Could not adjust stock for ${productName}.`, variant: "destructive" });
    }
  };

  if (!isClient || (isLoading && products.length === 0 && localCurrentUser)) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{!isClient ? "Initializing..." : "Loading inventory data..."}</p>
      </div>
    );
  }

  if (isClient && !localCurrentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view inventory.</p>
      </div>
    );
  }
  
  if (isClient && localCurrentUser && !localCurrentUser.merchantId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Your account is not associated with a merchant. Cannot load inventory.</p>
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
            {products.flatMap((product) => 
              product.units.map((unit, unitIndex) => (
                <TableRow key={`${product.id}-${unit.name}`}>
                  {unitIndex === 0 ? (
                    <TableCell rowSpan={product.units.length} className="font-medium align-top py-3 border-b">
                      {product.name}
                    </TableCell>
                  ) : null}
                  <TableCell className="py-3">{unit.name}</TableCell>
                  <TableCell className="text-right py-3">{unit.stock}</TableCell>
                  <TableCell className="text-center py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAdjustmentDialog(product.id, product.name, unit.name, unit.stock)}
                    >
                      <Edit className="mr-2 h-3 w-3" /> Sesuaikan Stok
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
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
      
      {adjustingItemDetails && (
        <StockAdjustmentDialog
          isOpen={isAdjustmentDialogOpen}
          onOpenChange={setIsAdjustmentDialogOpen}
          productName={adjustingItemDetails.productName}
          unitName={adjustingItemDetails.unitName}
          currentStock={adjustingItemDetails.currentStock}
          onSave={handleStockAdjustment}
        />
      )}
    </>
  );
}
