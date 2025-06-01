
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Supplier } from "@/types";
import { SupplierFormDialog } from './supplier-form-dialog';
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

// Mock data
const mockSuppliersData: Supplier[] = [
  { id: "sup_1", name: "Supplier Kopi Jaya", contactPerson: "Bapak Agus", phone: "081234567890", email: "agus@kopijaya.com", address: "Jl. Kopi No. 1, Jakarta", merchantId: "merch_1"},
  { id: "sup_2", name: "Supplier Air Segar", contactPerson: "Ibu Siti", phone: "081198765432", email: "siti@airsegar.co.id", address: "Jl. Air Bersih No. 10, Bandung", merchantId: "merch_1"},
  { id: "sup_3", name: "Toko Bahan Kue Makmur", contactPerson: "Pak Budi", phone: "085611223344", email: "info@makmurcake.com", address: "Jl. Raya Kue No. 88, Surabaya", merchantId: "merch_1"},
];

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliersData);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const handleSaveSupplier = async (data: Omit<Supplier, 'id' | 'merchantId'> & { id?: string }) => {
     return new Promise<void>((resolve) => {
        setTimeout(() => {
            if (editingSupplier) {
                setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? { ...editingSupplier, ...data, id: editingSupplier.id, merchantId: 'merch_1' } : s));
                toast({ title: "Supplier Updated", description: `${data.name} has been updated.` });
            } else {
                const newSupplier: Supplier = { ...data, id: `sup_${Date.now()}`, merchantId: 'merch_1' };
                setSuppliers([newSupplier, ...suppliers]);
                toast({ title: "Supplier Added", description: `${newSupplier.name} has been added.` });
            }
            setEditingSupplier(undefined);
            setIsFormOpen(false); 
            resolve();
        }, 500);
    });
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingSupplier(undefined);
    setIsFormOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      setSuppliers(suppliers.filter(s => s.id !== supplierToDelete.id));
      toast({ title: "Supplier Deleted", description: `${supplierToDelete.name} has been deleted.`, variant: "destructive" });
    }
    setShowDeleteConfirm(false);
    setSupplierToDelete(null);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <SupplierFormDialog 
            supplier={editingSupplier} 
            onSave={handleSaveSupplier} 
            triggerButton={<Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>}
        />
      </div>
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline">Name</TableHead>
              <TableHead className="font-headline">Contact Person</TableHead>
              <TableHead className="font-headline">Phone</TableHead>
              <TableHead className="font-headline">Email</TableHead>
              <TableHead className="text-right font-headline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                <TableCell>{supplier.phone || 'N/A'}</TableCell>
                <TableCell>{supplier.email || 'N/A'}</TableCell>
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
                      <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteSupplier(supplier)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No suppliers found. Start by adding a new supplier.
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
              This action cannot be undone. This will permanently delete the supplier
              <span className="font-semibold"> {supplierToDelete?.name}</span>.
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
      {isFormOpen && !editingSupplier && ( // Only render for "Add New" if explicitly opened
        <SupplierFormDialog
            supplier={undefined} // Ensure it's for a new supplier
            onSave={handleSaveSupplier}
            triggerButton={<div style={{display: 'none'}} />} 
        />
      )}
      {isFormOpen && editingSupplier && ( // Only render for "Edit" if explicitly opened
         <SupplierFormDialog
            supplier={editingSupplier}
            onSave={handleSaveSupplier}
            triggerButton={<div style={{display: 'none'}} />}
        />
      )}
    </>
  );
}
