
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product, Supplier } from "@/types";
import { ProductFormDialog } from './product-form-dialog';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
}

// This function is now only called client-side after mount
const getAuthenticatedUserFromStorage = (): StoredUser | null => {
  if (typeof window !== 'undefined') {
    const storedUserStr = localStorage.getItem('mockUser');
    if (storedUserStr) {
      try {
        return JSON.parse(storedUserStr) as StoredUser;
      } catch (e) {
        console.error("Failed to parse user from localStorage in ProductsTable", e);
        return null;
      }
    }
  }
  return null;
};

export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true); // True by default to indicate loading until data is fetched or user is invalid
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true); // Same as above
  
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const { toast } = useToast();
  
  const [currentUserLocal, setCurrentUserLocal] = useState<StoredUser | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentUserLocal(getAuthenticatedUserFromStorage());
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!currentUserLocal || !currentUserLocal.merchantId) {
      setProducts([]);
      setIsLoadingProducts(false); // Stop loading if no valid user/merchantId
      return;
    }
    setIsLoadingProducts(true);
    try {
      const q = query(
        collection(db, "products"),
        where("merchantId", "==", currentUserLocal.merchantId),
        orderBy("createdAt", "desc")
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
    setIsLoadingProducts(false);
  }, [currentUserLocal, toast]);

  const fetchAllSuppliers = useCallback(async () => {
    if (!currentUserLocal || !currentUserLocal.merchantId) {
      setAllSuppliers([]);
      setIsLoadingSuppliers(false); // Stop loading if no valid user/merchantId
      return;
    }
    setIsLoadingSuppliers(true);
    try {
      const q = query(
        collection(db, "suppliers"),
        where("merchantId", "==", currentUserLocal.merchantId),
        orderBy("name", "asc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedSuppliers: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSuppliers.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setAllSuppliers(fetchedSuppliers);
    } catch (error) {
      console.error("Error fetching suppliers for product form: ", error);
      setAllSuppliers([]);
    }
    setIsLoadingSuppliers(false);
  }, [currentUserLocal]);

  useEffect(() => {
    if (isClient && currentUserLocal) { // Only fetch if client and user is determined
      fetchProducts();
      fetchAllSuppliers();
    } else if (isClient && !currentUserLocal) {
      // If client and no user, stop loading states
      setIsLoadingProducts(false);
      setIsLoadingSuppliers(false);
    }
  }, [isClient, currentUserLocal, fetchProducts, fetchAllSuppliers]);

  const handleSaveSuccess = () => {
    fetchProducts(); 
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingProduct(undefined); 
    setIsFormOpen(true); 
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (productToDelete && currentUserLocal) { // Ensure currentUserLocal for operations
      try {
        await deleteDoc(doc(db, "products", productToDelete.id));
        toast({ title: "Product Deleted", description: `${productToDelete.name} has been deleted.`, variant: "destructive" });
        fetchProducts(); 
      } catch (error) {
        console.error("Error deleting product: ", error);
        toast({ title: "Delete Failed", description: "Could not delete product. Please try again.", variant: "destructive" });
      }
    }
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };
  
  if (!isClient) {
    // Server render and initial client render before useEffect populates isClient
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  if (!currentUserLocal) {
    // Client-side, but no authenticated user found in localStorage
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button disabled={true}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">User data not available. Please log in to manage products.</p>
        </div>
      </>
    );
  }

  if (!currentUserLocal.merchantId) {
    // Client-side, user found, but no merchantId
     return (
      <>
        <div className="flex justify-end mb-4">
          <Button disabled={true}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
        <div className="p-4 text-center text-destructive-foreground bg-destructive/80 rounded-md">
          Merchant information is missing for your account. Cannot manage products.
        </div>
      </>
    );
  }

  // At this point, isClient is true and currentUserLocal exists with a merchantId.
  // Now, we check the loading state for actual product/supplier data.
  if (isLoadingProducts || isLoadingSuppliers) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading products and suppliers...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
         <Button onClick={openNewDialog} disabled={!currentUserLocal?.merchantId || isLoadingSuppliers}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px] font-headline">Name</TableHead>
              <TableHead className="font-headline">Units</TableHead>
              <TableHead className="font-headline">Supplier</TableHead>
              <TableHead className="font-headline">Barcode</TableHead>
              <TableHead className="w-[100px] text-right font-headline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                    {product.units.map(unit => (
                        <Badge key={unit.name} variant="outline" className="mr-1 mb-1">
                            {unit.name}: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(unit.price)} (Stock: {unit.stock})
                        </Badge>
                    ))}
                </TableCell>
                <TableCell>
                  {product.supplierId ? (allSuppliers.find(s => s.id === product.supplierId)?.name || product.supplierId) : (product.buyOwn ? 'Beli Sendiri' : 'N/A')}
                </TableCell>
                <TableCell>{product.barcode || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditDialog(product)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && !isLoadingProducts && ( // Check !isLoadingProducts here
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No products found. Start by adding a new product.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              <span className="font-semibold"> {productToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {isFormOpen && currentUserLocal && ( // Ensure currentUserLocal for ProductFormDialog context
        <ProductFormDialog
            product={editingProduct}
            suppliers={allSuppliers}
            onSaveSuccess={handleSaveSuccess}
            isOpenProp={isFormOpen}
            onOpenChangeProp={setIsFormOpen}
        />
      )}
    </>
  );
}

  