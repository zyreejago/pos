
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, MapPin, Loader2 } from "lucide-react";
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
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';

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
        console.error("Failed to parse user from localStorage in OutletsTable", e);
        return null;
      }
    }
  }
  return null;
};

const OUTLETS_CACHE_KEY = 'outletsCacheKey'; 

export function OutletsTable() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null);
  const { toast } = useToast();

  const [componentCurrentUser, setComponentCurrentUser] = useState<StoredUser | null>(null);
  const [userCheckCompleted, setUserCheckCompleted] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setComponentCurrentUser(user);
    setUserCheckCompleted(true);
  }, []);

  const fetchOutlets = useCallback(async () => {
    if (!componentCurrentUser || !componentCurrentUser.merchantId) {
      setIsLoading(false);
      setOutlets([]);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "outlets"),
        where("merchantId", "==", componentCurrentUser.merchantId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedOutlets: Outlet[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOutlets.push({ id: doc.id, ...doc.data() } as Outlet);
      });
      setOutlets(fetchedOutlets);
    } catch (error: any) {
      console.error("[OutletsTable] Error fetching outlets: ", error);
      let desc = `Could not fetch outlets data: ${error.message}`;
      if (error.code === 'permission-denied') {
        desc = "Permission denied fetching outlets. Ensure admin's Firestore doc has correct 'role' & 'merchantId', and check Firestore rules.";
      }
      toast({ title: "Fetch Failed", description: desc, variant: "destructive", duration: 9000 });
      setOutlets([]);
    } finally {
      setIsLoading(false);
    }
  }, [componentCurrentUser, toast]);

  useEffect(() => {
    if (userCheckCompleted && componentCurrentUser) {
      if (componentCurrentUser.merchantId) {
        fetchOutlets();
      } else {
        setIsLoading(false);
        setOutlets([]);
      }
    } else if (userCheckCompleted && !componentCurrentUser) {
      setIsLoading(false);
      setOutlets([]);
    }
  }, [userCheckCompleted, componentCurrentUser, fetchOutlets]);


  useEffect(() => {
  }, [isFormOpen]);

  const signalOutletListChange = () => {
    const newCacheKeyValue = Date.now().toString();
    localStorage.setItem(OUTLETS_CACHE_KEY, newCacheKeyValue);
    window.dispatchEvent(new StorageEvent('storage', {
      key: OUTLETS_CACHE_KEY,
      newValue: newCacheKeyValue,
      storageArea: localStorage,
    }));
  };

  const handleSaveSuccess = () => {
    fetchOutlets(); 
    signalOutletListChange(); 
    setIsFormOpen(false); 
  };

  const openNewDialog = () => {
    setEditingOutlet(undefined);
    setIsFormOpen(true);
  };

  const openEditDialog = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setIsFormOpen(true);
  };

  const handleDeleteOutlet = (outlet: Outlet) => {
    setOutletToDelete(outlet);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (outletToDelete) {
      try {
        await deleteDoc(doc(db, "outlets", outletToDelete.id));
        toast({ title: "Outlet Deleted", description: `Outlet ${outletToDelete.name} has been deleted.`});
        
        if (typeof window !== 'undefined') {
            const selectedOutletId = localStorage.getItem('selectedOutletId');
            if (selectedOutletId === outletToDelete.id) {
                localStorage.removeItem('selectedOutletId');
                localStorage.removeItem('selectedOutletName');
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'selectedOutletId',
                  newValue: null, 
                  storageArea: localStorage,
                }));
            }
        }
        fetchOutlets(); 
        signalOutletListChange();

      } catch (error: any) {
        console.error("Error deleting outlet: ", error);
        let desc = `Could not delete outlet: ${error.message}`;
        if (error.code === 'permission-denied') {
            desc = "Permission denied deleting outlet. Check Firestore rules.";
        }
        toast({ title: "Delete Failed", description: desc, variant: "destructive", duration: 7000 });
      }
    }
    setShowDeleteConfirm(false);
    setOutletToDelete(null);
  };

  if (!userCheckCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Initializing user data...</p>
      </div>
    );
  }
  
  const canAddOutlet = userCheckCompleted && componentCurrentUser && componentCurrentUser.merchantId;

  const addOutletButton = (
    <Button onClick={openNewDialog} disabled={!userCheckCompleted || isLoading || !componentCurrentUser?.merchantId}>
      <PlusCircle className="mr-2 h-4 w-4" /> Add Outlet
    </Button>
  );

  if (!componentCurrentUser && userCheckCompleted) {
     return (
      <>
        <div className="flex justify-end mb-4">
           {addOutletButton}
        </div>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">User data not available. Please log in.</p>
        </div>
      </>
    );
  }

  if (!componentCurrentUser?.merchantId && userCheckCompleted) {
    return (
      <>
        <div className="flex justify-end mb-4">
           {addOutletButton}
        </div>
        <div className="p-4 text-center text-destructive-foreground bg-destructive/80 rounded-md">
          Merchant information is missing for your account. Cannot manage outlets.
        </div>
      </>
    );
  }
  
  return (
    <>
      <div className="flex justify-end mb-4">
        {addOutletButton}
      </div>
      {isLoading && outlets.length === 0 ? ( 
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading outlets...</p>
        </div>
      ) : (
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
              {outlets.length > 0 ? outlets.map((outlet) => (
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
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No outlets found. Start by adding a new outlet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the outlet
              <span className="font-semibold"> {outletToDelete?.name}</span>.
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
          onSaveSuccess={handleSaveSuccess}
          isOpenProp={isFormOpen}
          onOpenChangeProp={setIsFormOpen}
        />
      )}
    </>
  );
}


    