"use client";

import { useState } from 'react';
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle } from "lucide-react";
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
} from "@/components/ui/alert-dialog"

// Mock data
const mockProducts: Product[] = [
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
];

const mockSuppliers: Supplier[] = [
    { id: "sup_1", name: "Supplier Kopi Jaya", merchantId: "merch_1"},
    { id: "sup_2", name: "Supplier Air Segar", merchantId: "merch_1"},
];


export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  const handleSaveProduct = async (data: Omit<Product, 'id' | 'merchantId'> & { id?: string }) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            if (editingProduct) {
                setProducts(products.map(p => p.id === editingProduct.id ? { ...editingProduct, ...data, id: editingProduct.id, merchantId: 'merch_1' } : p));
                toast({ title: "Product Updated", description: `${data.name} has been updated.`});
            } else {
                const newProduct: Product = { ...data, id: `prod_${Date.now()}`, merchantId: 'merch_1' };
                setProducts([newProduct, ...products]);
                toast({ title: "Product Added", description: `${newProduct.name} has been added.`});
            }
            setEditingProduct(undefined);
            setIsFormOpen(false); 
            resolve();
        }, 500);
    });
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

  const confirmDelete = () => {
    if (productToDelete) {
      setProducts(products.filter(p => p.id !== productToDelete.id));
      toast({ title: "Product Deleted", description: `${productToDelete.name} has been deleted.`, variant: "destructive" });
    }
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };


  return (
    <>
      <div className="flex justify-end mb-4">
         <ProductFormDialog
            product={editingProduct}
            suppliers={mockSuppliers}
            onSave={handleSaveProduct}
            triggerButton={<Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>}
          />
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
                            {unit.name}: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(unit.price)} (Stock: {unit.stock})
                        </Badge>
                    ))}
                </TableCell>
                <TableCell>
                  {product.supplierId ? mockSuppliers.find(s => s.id === product.supplierId)?.name : (product.buyOwn ? 'Beli Sendiri' : 'N/A')}
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
            {products.length === 0 && (
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
      
      {isFormOpen && !triggerButton && ( // Conditionally render the dialog if controlled by state and no trigger is passed
        <ProductFormDialog
            product={editingProduct}
            suppliers={mockSuppliers}
            onSave={handleSaveProduct}
            triggerButton={<></>} // This instance's trigger is not visible; dialog is controlled by isFormOpen
        />
      )}
    </>
  );
}
