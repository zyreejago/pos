
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

      const kasirsQuery = query(
        collection(db, "users"),
        where("merchantId", "==", merchantId),
        where("role", "==", "kasir"),
        orderBy("name", "asc")
      );
      const kasirsSnapshot = await getDocs(kasirsQuery);
      const fetchedKasirs: User[] = kasirsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setKasirs(fetchedKasirs);

      const outletsQuery = query(
        collection(db, "outlets"),
        where("merchantId", "==", merchantId),
        orderBy("name", "asc")
      );
      const outletsSnapshot = await getDocs(outletsQuery);
      const fetchedOutlets: Outlet[] = outletsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Outlet));
      setAllOutlets(fetchedOutlets);

    } catch (error: any) {
      console.error("Error fetching kasirs or outlets: ", error);
      let desc = `Could not load kasir/outlet data: ${error.message}`;
      if (error.code === 'permission-denied') {
        desc = "Permission denied fetching kasir/outlet data. Ensure the admin user's Firestore document has correct 'role' & 'merchantId', and check Firestore rules.";
      }
      toast({ title: "Fetch Failed", description: desc, variant: "destructive", duration: 9000 });
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
    console.log("handleSaveKasir called. Current user:", currentUser);
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Merchant admin (current user) not identified or missing merchantId.", variant: "destructive" });
      return;
    }
    console.log("Merchant ID for new/updated kasir:", currentUser.merchantId);

    setIsLoading(true);
    try {
      if (kasirIdToUpdate) {
        // Editing existing kasir
        const kasirRef = doc(db, "users", kasirIdToUpdate);
        const updateData: Partial<User> = {
          name: data.name,
          email: data.email, // Keep email editable, though changing Auth email is complex
          outlets: data.outlets,
        };
        // Password update for existing users should be handled via a secure flow (e.g., Firebase Console or user-initiated reset)
        // For simplicity, this form won't directly update Auth password for existing users.
        if (data.password && data.password.length >= 6) {
            toast({ title: "Password Info", description: "To change an existing Kasir's password securely, use Firebase Console or a dedicated password reset flow.", variant: "default", duration: 7000});
        }
        await updateDoc(kasirRef, updateData);
        toast({ title: "Kasir Updated", description: `Kasir ${data.name} has been updated.` });
      } else {
        // Adding new kasir
        if (!data.password) {
          toast({ title: "Error", description: "Password is required for new kasir.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        let firebaseUser: AuthUser | null = null;
        try {
          console.log(`Attempting to create auth user: ${data.email} for merchant ${currentUser.merchantId}`);
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          firebaseUser = userCredential.user;
          console.log(`Auth user ${data.email} created successfully with UID: ${firebaseUser.uid}`);
          await updateAuthProfile(firebaseUser, { displayName: data.name });
        } catch (authError: any) {
          console.error("Error creating Firebase Auth user:", authError);
          let title = "Auth Creation Failed";
          let description = `Could not create authentication account for ${data.email}.`;
          if (authError.code === 'auth/email-already-in-use') {
            description = `This email (${data.email}) is already registered.`;
          } else if (authError.code === 'auth/weak-password') {
            description = "The password is too weak.";
          } else if (authError.code === 'auth/operation-not-allowed' || (authError.message && authError.message.toLowerCase().includes("permission"))) {
            title = "Auth Permission Denied";
            description = `Firebase Authentication denied user creation for ${data.email}. This usually requires Admin SDK (backend) privileges. Error: ${authError.message}`;
          } else {
            description = `Auth error for ${data.email}: ${authError.message} (Code: ${authError.code})`;
          }
          toast({ title, description, variant: "destructive", duration: 9000 });
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
        };

        try {
          console.log(`Attempting to set Firestore document for kasir: users/${firebaseUser.uid}`);
          await setDoc(doc(db, "users", firebaseUser.uid), newKasirDoc);
          console.log(`Firestore document for kasir ${data.name} created successfully.`);
          toast({ title: "Kasir Added", description: `Kasir ${data.name} (${data.email}) has been added.` });
        } catch (firestoreError: any) {
          console.error("Error setting Firestore document for kasir:", firestoreError);
          let title = "Firestore Save Failed";
          let description = `Kasir account for ${data.email} was created in Auth, but saving details to Firestore failed. Manual cleanup of Auth user ${data.email} might be needed.`;
           if (firestoreError.message && firestoreError.message.toLowerCase().includes("permission")) {
             title = "Firestore Permission Denied";
             description = `Auth user ${data.email} created, but writing to Firestore (users/${firebaseUser.uid}) denied. Check Firestore Security Rules for user ${currentUser.email} (merchantId: ${currentUser.merchantId}). Details: ${firestoreError.message}`;
           } else {
            description = `Firestore error for kasir ${data.email}: ${firestoreError.message} (Code: ${firestoreError.code})`;
           }
          toast({ title, description, variant: "destructive", duration: 9000 });
          setIsLoading(false);
          return;
        }
      }
      fetchKasirsAndOutlets();
      setEditingKasir(undefined);
      setIsFormOpen(false);
    } catch (error: any) { 
      console.error("Unexpected error in handleSaveKasir: ", error);
      toast({ title: "Save Failed", description: `An unexpected error occurred: ${error.message || error.toString()}`, variant: "destructive", duration: 9000 });
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
        await deleteDoc(doc(db, "users", kasirToDelete.id));
        toast({ title: "Kasir Data Deleted", description: `Kasir ${kasirToDelete.name}'s data has been removed from Firestore. Their authentication account may still exist.`, variant: "default" });
        fetchKasirsAndOutlets();
      } catch (error: any) {
        console.error("Error deleting kasir data: ", error);
        let errMsg = `Could not delete kasir data: ${error.message}`;
        if (error.code === 'permission-denied') {
            errMsg = `Permission denied when trying to delete kasir data (users/${kasirToDelete.id}). Check Firestore rules for user ${currentUser?.email}.`;
        }
        toast({ title: "Delete Failed", description: errMsg, variant: "destructive" });
      }
      setIsLoading(false);
    }
    setShowDeleteConfirm(false);
    setKasirToDelete(null);
  };

  const handleChangePassword = (kasir: User) => {
    toast({
        title: "Password Management",
        description: `Password changes for ${kasir.name} should ideally be done by the kasir via a 'Forgot Password' flow, or by a superadmin in the Firebase Console for security.`,
        duration: 8000
    });
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
                      <DropdownMenuItem onClick={() => openEditDialog(kasir)} disabled={isLoading || allOutlets.length === 0}>
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
          isOpenProp={isFormOpen}
          onOpenChangeProp={setIsFormOpen}
        />
      )}
    </>
  );
}


    