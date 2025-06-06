
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
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile, type User as AuthUser } from 'firebase/auth';

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

  const fetchKasirsAndOutlets = useCallback(async (isPostSaveOrDeleteRefresh = false) => {
    if (!currentUser || !currentUser.merchantId) {
      setIsLoading(false); 
      if (!isPostSaveOrDeleteRefresh) { // Only clear if it's not a refresh attempt after an action
        setKasirs([]);
        setAllOutlets([]);
      }
      return;
    }
    console.log(`[KasirTable] Fetching kasirs and outlets for merchant: ${currentUser.merchantId}. Is post-save/delete refresh: ${isPostSaveOrDeleteRefresh}`);
    if (!isPostSaveOrDeleteRefresh) { // Only set global loading if it's an initial fetch
      setIsLoading(true); 
    }
    
    let kasirsFetchedSuccessfully = false;
    let outletsFetchedSuccessfully = false;

    try {
      const merchantId = currentUser.merchantId;

      const kasirsQuery = query(
        collection(db, "users"),
        where("merchantId", "==", merchantId),
        where("role", "==", "kasir"),
        orderBy("name", "asc")
      );
      const kasirsSnapshot = await getDocs(kasirsQuery);
      const fetchedKasirs: User[] = kasirsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setKasirs(fetchedKasirs);
      kasirsFetchedSuccessfully = true;
      console.log(`[KasirTable] Fetched ${fetchedKasirs.length} kasirs.`);

      const outletsQuery = query(
        collection(db, "outlets"),
        where("merchantId", "==", merchantId),
        orderBy("name", "asc")
      );
      const outletsSnapshot = await getDocs(outletsQuery);
      const fetchedOutlets: Outlet[] = outletsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Outlet));
      setAllOutlets(fetchedOutlets);
      outletsFetchedSuccessfully = true;
      console.log(`[KasirTable] Fetched ${fetchedOutlets.length} outlets.`);

    } catch (error: any) {
      console.error("[KasirTable] Error fetching kasirs or outlets: ", error);
      let title = "Data Fetch Failed";
      let desc = `Could not load kasir/outlet data. Firestore Error: ${error.message}.`;
      let variant: "destructive" | "default" = "destructive";

      if (isPostSaveOrDeleteRefresh) {
          title = "Refresh Gagal (Data Tersimpan)";
          desc = "Data kasir kemungkinan berhasil disimpan/dihapus, tetapi refresh daftar gagal karena masalah izin sementara. Data baru akan muncul setelah memuat ulang halaman atau kunjungan berikutnya.";
          variant = "default";
      } else if (error.code === 'permission-denied') {
          desc = "Izin ditolak saat mengambil data kasir/outlet. Periksa dokumen admin Anda di Firestore (role & merchantId) dan Aturan Keamanan Firestore untuk operasi baca pada koleksi 'users' dan 'outlets'.";
      }
      toast({ title, description: desc, variant, duration: 9000 });
      
      // If it's not a post-action refresh and something fails, we might want to clear
      // to indicate a fundamental loading issue. But if it's a refresh, preserve old data.
      if (!isPostSaveOrDeleteRefresh) {
        if (!kasirsFetchedSuccessfully) setKasirs([]);
        if (!outletsFetchedSuccessfully) setAllOutlets([]);
      }
    } finally {
      if (!isPostSaveOrDeleteRefresh) {
        setIsLoading(false); 
      }
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (isClient) {
      if (currentUser && currentUser.merchantId) {
        fetchKasirsAndOutlets(false); // Initial fetch
      } else {
        setIsLoading(false); 
        setKasirs([]); 
        setAllOutlets([]); 
      }
    }
  }, [isClient, currentUser, fetchKasirsAndOutlets]);

  const handleSaveKasir = async (
    data: { name: string; email: string; password?: string; outlets: string[] },
    kasirIdToUpdate?: string
  ) => {
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error: Admin Not Identified", description: "Merchant admin (current user) not identified or missing merchantId. Cannot save kasir.", variant: "destructive" });
      return;
    }
    
    const operationIsLoading = true; // Local loading state for this operation
    setIsLoading(operationIsLoading); 

    try {
      if (kasirIdToUpdate) {
        const kasirRef = doc(db, "users", kasirIdToUpdate);
        const updateData: Partial<User> = {
          name: data.name,
          outlets: data.outlets,
          updatedAt: serverTimestamp(),
        };
        
        if (data.password && data.password.length >= 6) {
            toast({ title: "Password Info", description: "To change an existing Kasir's password securely, use Firebase Console or a dedicated password reset flow. This form does not update existing passwords directly.", variant: "default", duration: 7000});
        }
        await updateDoc(kasirRef, updateData);
        toast({ title: "Kasir Updated", description: `Kasir ${data.name} has been updated.` });
      } else {
        if (!data.password) {
          toast({ title: "Error: Password Required", description: "Password is required for new kasir.", variant: "destructive" });
          setIsLoading(false); // Reset global loading if only form validation failed
          return;
        }

        let firebaseUser: AuthUser | null = null;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          firebaseUser = userCredential.user;
          await updateAuthProfile(firebaseUser, { displayName: data.name });
        } catch (authError: any) {
          let title = "Kasir Auth Creation Failed";
          let description = `Could not create authentication account for ${data.email}. `;
          if (authError.code === 'auth/email-already-in-use') {
            description += `This email (${data.email}) is already registered.`;
          } else if (authError.code === 'auth/weak-password') {
            description += "The password is too weak.";
          } else if (authError.code === 'auth/operation-not-allowed' || authError.code === 'permission-denied' || (authError.message && authError.message.toLowerCase().includes("permission"))) {
            title = "Kasir Auth Creation Permission Denied";
            description = `Firebase Authentication denied user creation for ${data.email}. This operation (admin creating other users) usually requires backend (Firebase Functions with Admin SDK) privileges due to client-side restrictions. Auth Error: ${authError.message}`;
          } else {
            description += `Auth Error for ${data.email}: ${authError.message} (Code: ${authError.code})`;
          }
          toast({ title, description, variant: "destructive", duration: 10000 });
          setIsLoading(false); 
          return; 
        }

        const newKasirDoc: User = {
          id: firebaseUser.uid, 
          name: data.name,
          email: data.email,
          role: 'kasir',
          status: 'active', 
          merchantId: currentUser.merchantId, 
          outlets: data.outlets,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        try {
          await setDoc(doc(db, "users", firebaseUser.uid), newKasirDoc);
          toast({ title: "Kasir Added Successfully", description: `Kasir ${data.name} (${data.email}) has been added and Auth account created.` });
        } catch (firestoreError: any) {
          let title = "Kasir Firestore Save Failed";
          let description = `Kasir Auth account for ${data.email} was created, but saving details to Firestore failed. Manual cleanup of Auth user ${data.email} (UID: ${firebaseUser.uid}) might be needed. `;
           if (firestoreError.code === 'permission-denied' || (firestoreError.message && firestoreError.message.toLowerCase().includes("permission"))) {
             title = "Kasir Firestore Save Permission Denied";
             description += `Writing to Firestore (users/${firebaseUser.uid}) denied. Check Firestore Security Rules for user ${currentUser.email} (admin for merchantId: ${currentUser.merchantId}). Firestore Error: ${firestoreError.message}`;
           } else {
            description += `Firestore Error for kasir ${data.email}: ${firestoreError.message} (Code: ${firestoreError.code})`;
           }
          toast({ title, description, variant: "destructive", duration: 10000 });
          setIsLoading(false);
          return;
        }
      }
      
      setIsFormOpen(false);
      setEditingKasir(undefined);
      
      setTimeout(() => {
        fetchKasirsAndOutlets(true); 
      }, 500); 

    } catch (error: any) { 
      console.error("[KasirTable] Unexpected error in handleSaveKasir: ", error);
      toast({ title: "Save Kasir Failed (Unexpected)", description: `An unexpected error occurred: ${error.message || error.toString()}`, variant: "destructive", duration: 9000 });
    } finally {
      setIsLoading(false); // Ensure global loading is reset
    }
  };

  const openEditDialog = (kasir: User) => {
    setEditingKasir(kasir);
    setIsFormOpen(true);
  };

  const openNewDialog = () => {
    if (allOutlets.length === 0 && !isLoading) { 
        toast({ title: "Cannot Add Kasir", description: "Please add at least one outlet before adding a kasir.", variant: "default" });
        return;
    }
    setEditingKasir(undefined);
    setIsFormOpen(true);
  };

  const handleDeleteKasir = (kasir: User) => {
    setKasirToDelete(kasir);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (kasirToDelete) {
      const operationIsLoading = true;
      setIsLoading(operationIsLoading);
      try {
        await deleteDoc(doc(db, "users", kasirToDelete.id));
        toast({ title: "Kasir Data Deleted", description: `Kasir ${kasirToDelete.name}'s data has been removed from Firestore. Their authentication account may still exist.`, variant: "default" });
        
        setTimeout(() => {
          fetchKasirsAndOutlets(true); 
        }, 500);

      } catch (error: any) {
        let errMsg = `Could not delete kasir data: ${error.message}`;
        if (error.code === 'permission-denied') {
            errMsg = `Permission denied when trying to delete kasir data (users/${kasirToDelete.id}). Check Firestore rules for user ${currentUser?.email}.`;
        }
        toast({ title: "Delete Kasir Data Failed", description: errMsg, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    setShowDeleteConfirm(false);
    setKasirToDelete(null);
  };

  const handleChangePassword = (kasir: User) => {
    toast({
        title: "Password Management Info",
        description: `Password changes for ${kasir.name} should ideally be done by the kasir via a 'Forgot Password' flow, or by a superadmin in the Firebase Console for security.`,
        duration: 8000
    });
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Initializing Kasir Management...</p>
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
          <p>User not authenticated. Please log in to manage kasirs.</p>
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
          Merchant information is missing for your admin account. Cannot manage kasirs.
        </div>
      </>
    );
  }

  // Global loading state for initial data load
  if (isLoading && !isFormOpen && !showDeleteConfirm) {
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
        <Button onClick={openNewDialog} disabled={isLoading || (allOutlets.length === 0 && !isLoading) }>
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
                      return <Badge key={outletId} variant="secondary" className="mr-1 mb-1 gap-1"><Store className="h-3 w-3"/>{outlet ? outlet.name : outletId.substring(0,6)+'...'}</Badge>;
                    })
                  ) : (
                    <Badge variant="outline">No Access</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={kasir.status === 'active' ? 'default' : 'destructive'} className="capitalize">
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
                      <DropdownMenuItem onClick={() => openEditDialog(kasir)} disabled={isLoading || (allOutlets.length === 0 && !isLoading) }>
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
                  No kasirs found for this merchant. Start by adding a new kasir.
                </TableCell>
              </TableRow>
            )}
             {/* This explicit table-wide loader is removed as the main page loader covers it */}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the kasir data for <span className="font-semibold">{kasirToDelete?.name}</span> from Firestore. Their authentication account might still exist and would need to be managed separately (e.g., via Firebase Console or a backend function). This cannot be undone.
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
          isOpenProp={isFormOpen}
          onOpenChangeProp={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingKasir(undefined); 
          }}
        />
      )}
    </>
  );
}

    