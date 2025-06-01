
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Outlet } from "@/types";
import { OutletFormDialog } from './outlet-form-dialog';
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

const APP_OUTLETS_STORAGE_KEY = 'tokoAppMockOutlets';

const initialMockOutlets: Outlet[] = [
  { id: "outlet_1", name: "Main Outlet", address: "Jl. Sudirman No. 123, Jakarta Pusat", merchantId: "merch_1" },
  { id: "outlet_2", name: "Branch Kemang", address: "Jl. Kemang Raya No. 45, Jakarta Selatan", merchantId: "merch_1" },
  { id: "outlet_3", name: "Warehouse Cilandak", address: "Jl. TB Simatupang Kav. 6, Jakarta Selatan", merchantId: "merch_1" },
];

const getStoredOutlets = (): Outlet[] => {
  if (typeof window === 'undefined') {
    return initialMockOutlets;
  }
  const stored = localStorage.getItem(APP_OUTLETS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse outlets from localStorage", e);
      localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(initialMockOutlets));
      return initialMockOutlets;
    }
  } else {
    localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(initialMockOutlets));
    return initialMockOutlets;
  }
};

const storeOutlets = (outlets: Outlet[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(outlets));
  }
};

export function OutletsTable() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setOutlets(getStoredOutlets());
  }, []);

  const handleSaveOutlet = async (data: Omit<Outlet, 'id' | 'merchantId'> & { id?: string }) => {
     return new Promise<void>((resolve) => {
        setTimeout(() => {
            let updatedOutlets: Outlet[];
            if (editingOutlet) {
                updatedOutlets = outlets.map(o => o.id === editingOutlet.id ? { ...editingOutlet, ...data, id: editingOutlet.id, merchantId: "merch_1" } : o);
                toast({ title: "Outlet Updated", description: `Outlet ${data.name} has been updated.`});
            } else {
                const newOutlet: Outlet = { ...data, id: `outlet_${Date.now()}`, merchantId: "merch_1" };
                updatedOutlets = [newOutlet, ...outlets];
                toast({ title: "Outlet Added", description: `Outlet ${newOutlet.name} has been added.`});
            }
            setOutlets(updatedOutlets);
            storeOutlets(updatedOutlets);
            setEditingOutlet(undefined);
            setIsFormOpen(false);
            resolve();
        }, 500);
    });
  };

  const openEditDialog = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setIsFormOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingOutlet(undefined);
    setIsFormOpen(true);
  };

  const handleDeleteOutlet = (outlet: Outlet) => {
    setOutletToDelete(outlet);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (outletToDelete) {
      const updatedOutlets = outlets.filter(o => o.id !== outletToDelete.id);
      setOutlets(updatedOutlets);
      storeOutlets(updatedOutlets);
      toast({ title: "Outlet Deleted", description: `Outlet ${outletToDelete.name} has been deleted.`, variant: "destructive" });
    }
    setShowDeleteConfirm(false);
    setOutletToDelete(null);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <OutletFormDialog 
            outlet={editingOutlet} 
            onSave={handleSaveOutlet}
            triggerButton={<Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Outlet</Button>}
        />
      </div>
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline">Name</TableHead>
              <TableHead className="font-headline">Address</TableHead>
              <TableHead className="w-[100px] text-right font-headline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outlets.map((outlet) => (
              <TableRow key={outlet.id}>
                <TableCell className="font-medium">{outlet.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{outlet.address}</span>
                  </div>
                </TableCell>
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
                      <DropdownMenuItem onClick={() => openEditDialog(outlet)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteOutlet(outlet)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {outlets.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No outlets found. Start by adding a new outlet.
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
              This action cannot be undone. This will permanently delete the outlet
              <span className="font-semibold"> {outletToDelete?.name}</span> and all associated data.
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
        <OutletFormDialog
          outlet={editingOutlet}
          onSave={handleSaveOutlet}
          triggerButton={<div style={{display: 'none'}} />} 
        />
      )}
    </>
  );
}

    