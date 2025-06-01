
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, KeyRound, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator, // Added import
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, Outlet } from "@/types";
import { KasirFormDialog } from './kasir-form-dialog';
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
const mockKasirsData: User[] = [
  { id: "kasir_1", name: "Andi Setiawan", email: "andi.s@example.com", role: "kasir", outlets: ["outlet_1", "outlet_2"], status: "active", merchantId: "merch_1" },
  { id: "kasir_2", name: "Bunga Citra", email: "bunga.c@example.com", role: "kasir", outlets: ["outlet_1"], status: "active", merchantId: "merch_1" },
  { id: "kasir_3", name: "Charlie Darmawan", email: "charlie.d@example.com", role: "kasir", outlets: ["outlet_2", "outlet_3"], status: "inactive", merchantId: "merch_1" },
];

const mockAllOutlets: Outlet[] = [
  { id: "outlet_1", name: "Main Outlet", address: "Jl. Sudirman No. 123", merchantId: "merch_1" },
  { id: "outlet_2", name: "Branch Kemang", address: "Jl. Kemang Raya No. 45", merchantId: "merch_1" },
  { id: "outlet_3", name: "Warehouse Cilandak", address: "Jl. TB Simatupang Kav. 6", merchantId: "merch_1" },
];


export function KasirTable() {
  const [kasirs, setKasirs] = useState<User[]>(mockKasirsData);
  const [editingKasir, setEditingKasir] = useState<User | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [kasirToDelete, setKasirToDelete] = useState<User | null>(null);
  const { toast } = useToast();

  const handleSaveKasir = async (data: Omit<User, 'id' | 'role' | 'status' | 'merchantId'> & { id?: string, password?: string }, kasirIdToUpdate?: string) => {
     return new Promise<void>((resolve) => {
        setTimeout(() => {
            const kasirToSave = {
                ...data,
                role: 'kasir' as const,
                status: editingKasir ? editingKasir.status : 'active' as const, // Retain status if editing, else active
                merchantId: 'merch_1',
            };

            if (kasirIdToUpdate) { // Editing existing kasir
                setKasirs(kasirs.map(k => k.id === kasirIdToUpdate ? { ...k, ...kasirToSave, id: kasirIdToUpdate } : k));
                toast({ title: "Kasir Updated", description: `Kasir ${data.name} has been updated.`});
            } else { // Adding new kasir
                const newKasir: User = { ...kasirToSave, id: `kasir_${Date.now()}`};
                setKasirs([newKasir, ...kasirs]);
                toast({ title: "Kasir Added", description: `Kasir ${newKasir.name} has been added.`});
            }
            setEditingKasir(undefined);
            setIsFormOpen(false);
            resolve();
        }, 500);
    });
  };
  
  const openEditDialog = (kasir: User) => {
    setEditingKasir(kasir);
    setIsFormOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingKasir(undefined);
    setIsFormOpen(true);
  };

  const handleDeleteKasir = (kasir: User) => {
    setKasirToDelete(kasir);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (kasirToDelete) {
      setKasirs(kasirs.filter(k => k.id !== kasirToDelete.id));
      toast({ title: "Kasir Deleted", description: `Kasir ${kasirToDelete.name} has been deleted.`, variant: "destructive" });
    }
    setShowDeleteConfirm(false);
    setKasirToDelete(null);
  };
  
  const handleChangePassword = (kasir: User) => {
    // Placeholder for password change functionality
    // Typically, this would open a new dialog or redirect to a password change form
    toast({ title: "Change Password", description: `Initiate password change for ${kasir.name}. (Not implemented)`});
  };


  return (
    <>
      <div className="flex justify-end mb-4">
         <KasirFormDialog 
            kasir={editingKasir} 
            allOutlets={mockAllOutlets} 
            onSave={handleSaveKasir}
            triggerButton={<Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Kasir</Button>}
        />
      </div>
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline">Name</TableHead>
              <TableHead className="font-headline">Email</TableHead>
              <TableHead className="font-headline">Outlet Access</TableHead>
              <TableHead className="font-headline">Status</TableHead>
              <TableHead className="text-right font-headline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kasirs.map((kasir) => (
              <TableRow key={kasir.id}>
                <TableCell className="font-medium">{kasir.name}</TableCell>
                <TableCell>{kasir.email}</TableCell>
                <TableCell>
                  {kasir.outlets && kasir.outlets.length > 0 ? (
                    kasir.outlets.map(outletId => {
                      const outlet = mockAllOutlets.find(o => o.id === outletId);
                      return <Badge key={outletId} variant="secondary" className="mr-1 mb-1 gap-1"><Store className="h-3 w-3"/>{outlet ? outlet.name : 'Unknown Outlet'}</Badge>;
                    })
                  ) : (
                    <Badge variant="outline">No Access</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={kasir.status === 'active' ? 'default' : 'destructive'} className="capitalize bg-opacity-20 border-opacity-50">
                    {kasir.status.replace('_', ' ')}
                  </Badge>
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
                      <DropdownMenuItem onClick={() => openEditDialog(kasir)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => handleChangePassword(kasir)}>
                        <KeyRound className="mr-2 h-4 w-4" /> Change Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator/>
                      <DropdownMenuItem onClick={() => handleDeleteKasir(kasir)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Kasir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {kasirs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No kasirs found. Start by adding a new kasir.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the kasir account for 
              <span className="font-semibold"> {kasirToDelete?.name}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Kasir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFormOpen && (
        <KasirFormDialog
          kasir={editingKasir}
          allOutlets={mockAllOutlets}
          onSave={handleSaveKasir}
          triggerButton={<div style={{display: 'none'}}/>} // Hidden trigger, dialog controlled by isFormOpen
        />
      )}
    </>
  );
}
