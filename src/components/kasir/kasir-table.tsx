
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, KeyRound, Store, Loader2, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { db, auth, serverTimestamp } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';

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
        console.error("Failed to parse user from localStorage in KasirTable", e);
        return null;
      }
    }
  }
  return null;
};

export function KasirTable() {
  const [kasirs, setKasirs] = useState<User[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKasir, setEditingKasir] = useState<User | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [kasirToDelete, setKasirToDelete] = useState<User | null>(null);
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentUser(getCurrentUserFromStorage());
  }, []);

  const fetchKasirsAndOutlets = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId) {
      setKasirs([]);
      setAllOutlets([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const merchantId = currentUser.merchantId;

      // Fetch Kasirs
      const kasirsQuery = query(
        collection(db, "users"),
        where("merchantId", "==", merchantId),
        where("role", "==", "kasir"),
        orderBy("name", "asc")
      );
      const kasirsSnapshot = await getDocs(kasirsQuery);
      const fetchedKasirs: User[] = kasirsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setKasirs(fetchedKasirs);

      // Fetch Outlets
      const outletsQuery = query(
        collection(db, "outlets"),
        where("merchantId", "==", merchantId),
        orderBy("name", "asc")
      );
      const outletsSnapshot = await getDocs(outletsQuery);
      const fetchedOutlets: Outlet[] = outletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
      setAllOutlets(fetchedOutlets);

    } catch (error: any) {
      console.error("Error fetching kasirs or outlets: ", error);
      toast({ title: "Fetch Failed", description: `Could not load data: ${error.message}`, variant: "destructive" });
      setKasirs([]);
      setAllOutlets([]);
    }
    setIsLoading(false);
  }, [currentUser, toast]);

  useEffect(() => {
    if (isClient && currentUser && currentUser.merchantId) {
      fetchKasirsAndOutlets();
    } else if (isClient && (!currentUser || !currentUser.merchantId)) {
      setIsLoading(false);
    }
  }, [isClient, currentUser, fetchKasirsAndOutlets]);

  const handleSaveKasir = async (
    data: { name: string; email: string; password?: string; outlets: string[] },
    kasirIdToUpdate?: string
  ) => {
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Merchant admin not identified.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (kasirIdToUpdate) { // Editing existing kasir
        const kasirRef = doc(db, "users", kasirIdToUpdate);
        const updateData: Partial<User> = {
          name: data.name,
          email: data.email, // Note: Changing email in Firestore doesn't change Firebase Auth email.
          outlets: data.outlets,
          // Password changes for existing users are complex and ideally handled via Firebase Admin SDK or separate flows.
          // Here, we're only updating Firestore data.
        };
        await updateDoc(kasirRef, updateData);
        toast({ title: "Kasir Updated", description: `Kasir ${data.name} has been updated.` });
      } else { // Adding new kasir
        if (!data.password) {
          toast({ title: "Error", description: "Password is required for new kasir.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const firebaseUser = userCredential.user;

        // 2. Update Firebase Auth profile (optional)
        await updateAuthProfile(firebaseUser, { displayName: data.name });

        // 3. Save user data to Firestore
        const newKasirDoc: User = {
          id: firebaseUser.uid,
          name: data.name,
          email: data.email,
          role: 'kasir',
          status: 'active',
          merchantId: currentUser.merchantId,
          outlets: data.outlets,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", firebaseUser.uid), newKasirDoc);
        toast({ title: "Kasir Added", description: `Kasir ${data.name} has been added.` });
      }
      fetchKasirsAndOutlets(); // Refresh list
      setEditingKasir(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error saving kasir: ", error);
      let errMsg = `Could not save kasir: ${error.message}.`;
      if (error.code === 'auth/email-already-in-use') {
        errMsg = "This email is already registered in Firebase Authentication.";
      } else if (error.code === 'auth/weak-password') {
        errMsg = "The password is too weak.";
      }
      toast({ title: "Save Failed", description: errMsg, variant: "destructive" });
    }
    setIsLoading(false);
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

  const confirmDelete = async () => {
    if (kasirToDelete) {
      setIsLoading(true);
      try {
        // Deleting Firestore document. Auth user deletion is more complex.
        await deleteDoc(doc(db, "users", kasirToDelete.id));
        toast({ title: "Kasir Data Deleted", description: `Kasir ${kasirToDelete.name}'s data has been removed from Firestore. Their authentication account may still exist.`, variant: "default" });
        fetchKasirsAndOutlets();
      } catch (error: any) {
        console.error("Error deleting kasir data: ", error);
        toast({ title: "Delete Failed", description: `Could not delete kasir data: ${error.message}`, variant: "destructive" });
      }
      setIsLoading(false);
    }
    setShowDeleteConfirm(false);
    setKasirToDelete(null);
  };

  const handleChangePassword = (kasir: User) => {
    toast({ title: "Password Management", description: `Password changes for ${kasir.name} should be handled securely (e.g., Firebase Console, admin SDK, or user-initiated reset).` });
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Add Kasir</Button>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <UserX className="h-12 w-12 mb-4 text-destructive" />
          <p>User not authenticated. Please log in.</p>
        </div>
      </>
    );
  }

  if (!currentUser.merchantId) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Add Kasir</Button>
        </div>
        <div className="p-4 text-center text-destructive-foreground bg-destructive/80 rounded-md">
          Merchant information is missing for your account. Cannot manage kasirs.
        </div>
      </>
    );
  }
  
  if (isLoading && kasirs.length === 0 && allOutlets.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading kasir and outlet data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openNewDialog} disabled={isLoading || allOutlets.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Kasir
        </Button>
        {allOutlets.length === 0 && !isLoading && (
            <p className="text-sm text-destructive ml-2 self-center">Please add outlets first to assign kasirs.</p>
        )}
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
                      const outlet = allOutlets.find(o => o.id === outletId);
                      return <Badge key={outletId} variant="secondary" className="mr-1 mb-1 gap-1"><Store className="h-3 w-3"/>{outlet ? outlet.name : 'Unknown Outlet'}</Badge>;
                    })
                  ) : (
                    <Badge variant="outline">No Access</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={kasir.status === 'active' ? 'default' : 'destructive'} className="capitalize bg-opacity-20 border-opacity-50">
                    {kasir.status?.replace('_', ' ') || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditDialog(kasir)} disabled={isLoading}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => handleChangePassword(kasir)} disabled={isLoading}>
                        <KeyRound className="mr-2 h-4 w-4" /> Change Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator/>
                      <DropdownMenuItem onClick={() => handleDeleteKasir(kasir)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isLoading}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Kasir Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {kasirs.length === 0 && !isLoading && (
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
              This action will delete the kasir data for <span className="font-semibold">{kasirToDelete?.name}</span> from Firestore. Their authentication account might still exist. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Kasir Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFormOpen && (
        <KasirFormDialog
          kasir={editingKasir}
          allOutlets={allOutlets}
          onSave={handleSaveKasir}
          triggerButton={<div style={{display: 'none'}}/>}
          // isOpenProp and onOpenChangeProp can be used if strict external control is needed,
          // but for now, the KasirFormDialog manages its own open state internally via its trigger
          // and the setIsFormOpen state here.
        />
      )}
    </>
  );
}

    