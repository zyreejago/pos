
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, Loader2 } from "lucide-react";
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
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';

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
        console.error("Failed to parse user from localStorage in SuppliersTable", e);
        return null;
      }
    }
  }
  return null;
};

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Represents loading of suppliers
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentUser(getCurrentUserFromStorage());
  }, []);

  const fetchSuppliers = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId) {
      setIsLoading(false);
      setSuppliers([]);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "suppliers"),
        where("merchantId", "==", currentUser.merchantId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedSuppliers: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSuppliers.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setSuppliers(fetchedSuppliers);
    } catch (error) {
      console.error("Error fetching suppliers: ", error);
      toast({ title: "Fetch Failed", description: "Could not fetch suppliers data.", variant: "destructive" });
      setSuppliers([]);
    }
    setIsLoading(false);
  }, [currentUser, toast]);

  useEffect(() => {
    if (isClient && currentUser && currentUser.merchantId) {
      fetchSuppliers();
    } else if (isClient && (!currentUser || !currentUser.merchantId)) {
      // If on client and no user or no merchantId, stop loading and show appropriate message.
      setIsLoading(false);
    }
  }, [isClient, currentUser, fetchSuppliers]);

  const handleSaveSuccess = () => {
    fetchSuppliers();
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

  const confirmDelete = async () => {
    if (supplierToDelete) {
      try {
        await deleteDoc(doc(db, "suppliers", supplierToDelete.id));
        toast({ title: "Supplier Deleted", description: `Supplier ${supplierToDelete.name} has been deleted.` });
        fetchSuppliers();
      } catch (error) {
        console.error("Error deleting supplier: ", error);
        toast({ title: "Delete Failed", description: "Could not delete supplier. Please try again.", variant: "destructive" });
      }
    }
    setShowDeleteConfirm(false);
    setSupplierToDelete(null);
  };

  // Render a consistent initial loading state for SSR and client's first paint
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  // After client has mounted, proceed with conditional rendering based on currentUser and isLoading
  if (!currentUser) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button disabled={true}><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
        </div>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">User data not available. Please log in.</p>
        </div>
      </>
    );
  }

  if (!currentUser.merchantId) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button disabled={true}><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
        </div>
        <div className="p-4 text-center text-destructive-foreground bg-destructive/80 rounded-md">
          Merchant information is missing for your account. Cannot manage suppliers.
        </div>
      </>
    );
  }
  
  if (isLoading) { // This isLoading now specifically refers to suppliers loading
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button onClick={openNewDialog} disabled={!currentUser?.merchantId || isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading suppliers...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openNewDialog} disabled={!currentUser?.merchantId}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
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
            {suppliers.length === 0 && !isLoading && (
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

      {isFormOpen && (
        <SupplierFormDialog
          supplier={editingSupplier}
          onSaveSuccess={handleSaveSuccess}
          isOpenProp={isFormOpen}
          onOpenChangeProp={setIsFormOpen}
        />
      )}
    </>
  );
}
