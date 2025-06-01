
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, KeyRound, CheckCircle, XCircle, UserPlus, Store, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, UserRole } from "@/types";
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
import { MerchantFormDialog } from './merchant-form-dialog';
import { auth, db, serverTimestamp } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMerchantFormOpen, setIsMerchantFormOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ user: User; actionType: 'approve' | 'deactivate' | 'activate' | 'delete' } | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
    } catch (error: any) {
      console.error("Error fetching users: ", error);
      const currentAuthUser = auth.currentUser;
      const clientAuthUID = currentAuthUser ? currentAuthUser.uid : 'No User Logged In (Client)';
      toast({ 
        title: "Fetch Failed", 
        description: `Could not load user data (Client UID: ${clientAuthUID}): ${error.message || 'Unknown error'}. Check Firestore rules or user data.`, 
        variant: "destructive" 
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApproveMerchant = async (userToApprove: User) => {
    setConfirmAction({ user: userToApprove, actionType: 'approve' });
    setShowConfirmDialog(true);
  };

  const handleChangeStatus = (userToChange: User, newStatus: 'active' | 'inactive') => {
     setConfirmAction({ user: userToChange, actionType: newStatus === 'active' ? 'activate' : 'deactivate' });
     setShowConfirmDialog(true);
  };
  
  const handleDeleteUser = (userToDelete: User) => {
    setConfirmAction({ user: userToDelete, actionType: 'delete' });
    setShowConfirmDialog(true);
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { user, actionType } = confirmAction;
    const userDocRef = doc(db, "users", user.id);
    let toastMessage = "";

    try {
      switch (actionType) {
          case 'approve':
              await updateDoc(userDocRef, { status: 'active' });
              toastMessage = `Merchant ${user.name} has been approved and activated.`;
              break;
          case 'activate':
              await updateDoc(userDocRef, { status: 'active' });
              toastMessage = `User ${user.name} has been activated.`;
              break;
          case 'deactivate':
              await updateDoc(userDocRef, { status: 'inactive' });
              toastMessage = `User ${user.name} has been deactivated.`;
              break;
          case 'delete':
              if (user.role === 'superadmin') {
                toast({ title: "Action Denied", description: "Superadmin accounts cannot be deleted from here.", variant: "destructive" });
                setShowConfirmDialog(false);
                setConfirmAction(null);
                return;
              }
              await deleteDoc(userDocRef);
              // Consider also deleting user from Firebase Auth here if needed,
              // but that requires backend function or careful client-side handling.
              toastMessage = `User ${user.name}'s data has been deleted from the database. Their authentication account may still exist.`;
              toast({ title: "User Data Deleted", description: toastMessage, variant: "destructive" });
              fetchUsers(); 
              setShowConfirmDialog(false);
              setConfirmAction(null);
              return; 
      }
      toast({ title: "Action Successful", description: toastMessage });
      fetchUsers(); 
    } catch (error: any) {
        console.error(`Error performing action ${actionType} for user ${user.id}:`, error);
        toast({ 
            title: "Action Failed", 
            description: `Could not ${actionType} user: ${error.message || 'Unknown error'}.`, 
            variant: "destructive" 
        });
    }

    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const handleChangePassword = (user: User) => {
    toast({ title: "Password Change", description: `Password change for ${user.name} needs to be handled (e.g., via Firebase console or custom flow).` });
  };
  
  const handleAddMerchant = async (data: { name: string, email: string, password?: string }) => {
    if (!data.password) {
        toast({ title: "Error", description: "Password is required to create a new merchant admin.", variant: "destructive" });
        return;
    }
    
    const loggedInSuperAdmin = auth.currentUser;

    if (!loggedInSuperAdmin) {
        toast({ title: "Authentication Error", description: "Superadmin not logged in. Please re-login.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    toast({
      title: "Debug Info: Attempting Add Merchant",
      description: `Logged in Superadmin UID (Client): ${loggedInSuperAdmin.uid}. Adding merchant admin: ${data.email}`,
      duration: 9000, 
    });

    setIsLoading(true);
    let firebaseUserUID: string | null = null; 

    try {
        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const firebaseUser = userCredential.user;
        firebaseUserUID = firebaseUser.uid; 

        if (firebaseUser) {
            await updateProfile(firebaseUser, { displayName: data.name });

            // Data for the new merchant admin user in Firestore
            const newUserDoc: User = {
                id: firebaseUser.uid, // UID of the new merchant admin
                name: data.name,
                email: data.email,
                role: 'admin', // Set role to 'admin'
                status: 'active', // Set status to 'active'
                merchantId: loggedInSuperAdmin.uid, // Use UID of the superadmin who is creating this user
                createdAt: serverTimestamp(),
            };
            
            // Save user data to Firestore
            await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);

            toast({ title: "Merchant Admin Added", description: `Merchant admin ${data.name} (${data.email}) has been created and activated under superadmin ${loggedInSuperAdmin.displayName || loggedInSuperAdmin.email}.` });
            setIsMerchantFormOpen(false);
            fetchUsers();
        }
    } catch (error: any) {
        console.error("Error adding new merchant admin: ", error);
        let errorMessage = "An unexpected error occurred. Please try again.";
        const clientAuthUID = loggedInSuperAdmin.uid; // Already checked for null

        if (error.name === 'FirebaseError' || error.constructor.name === 'FirebaseError') { 
            if (error.message && error.message.toLowerCase().includes('permission-denied') && error.message.toLowerCase().includes('firestore')) {
                 errorMessage = `Failed to save merchant data to Firestore: Permission denied. Please check Firestore rules and superadmin data (Client UID: ${clientAuthUID}). Auth user ${data.email} was created but Firestore data failed. Manual cleanup of auth user may be needed.`;
            } else {
                 switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = `This email (${data.email}) is already registered in Authentication.`;
                        break;
                    case 'auth/weak-password':
                        errorMessage = "The password is too weak. Please choose a stronger password.";
                        break;
                    default:
                        if (error.message && error.message.toLowerCase().includes('firestore')) {
                            errorMessage = `Firestore error (Client UID: ${clientAuthUID}): ${error.message}. Check rules and data.`;
                             if (firebaseUserUID) {
                                errorMessage += ` Auth user ${data.email} was created. Manual cleanup may be needed.`;
                            }
                        } else if (error.message && error.message.toLowerCase().includes('auth')) {
                            errorMessage = `Authentication error: ${error.message}`;
                        } else {
                            errorMessage = `Failed to add merchant (Client UID: ${clientAuthUID}): ${error.message || 'Unknown error'}`;
                        }
                        break;
                }
            }
        } else {
             errorMessage = `Failed to add merchant (Client UID: ${clientAuthUID}): ${error.toString()}`;
        }
        
        toast({ title: "Add Merchant Failed", description: errorMessage, variant: "destructive", duration: 9000 });
    }
    setIsLoading(false);
  };
  
  const getStatusBadgeVariant = (status?: User['status']) => { 
    if (status === 'active') return 'default';
    if (status === 'pending_approval') return 'secondary';
    if (status === 'inactive') return 'destructive';
    return 'outline';
  };
  
  const getRoleDisplayName = (role?: UserRole) => { 
    if (!role) return 'N/A';
    switch(role) {
        case 'superadmin': return 'Super Admin';
        case 'admin': return 'Merchant Admin';
        case 'kasir': return 'Kasir';
        default: return role;
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsMerchantFormOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Merchant Admin
        </Button>
      </div>
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline">Name</TableHead>
              <TableHead className="font-headline">Email</TableHead>
              <TableHead className="font-headline">Role</TableHead>
              <TableHead className="font-headline">Status</TableHead>
              <TableHead className="font-headline">Associated Merchant ID</TableHead>
              <TableHead className="text-right font-headline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                    <Badge variant="outline" className="capitalize">{getRoleDisplayName(user.role)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)} className="capitalize bg-opacity-20 border-opacity-50">
                    {user.status?.replace('_', ' ') || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>{user.merchantId || (user.role === 'superadmin' ? 'N/A (Superadmin)' : 'Not Set')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                      {user.status === 'pending_approval' && user.role === 'admin' && (
                        <DropdownMenuItem onClick={() => handleApproveMerchant(user)} className="text-green-600 focus:text-green-700 focus:bg-green-500/10">
                          <CheckCircle className="mr-2 h-4 w-4" /> Approve Merchant
                        </DropdownMenuItem>
                      )}
                      { (user.role === 'admin' || user.role === 'superadmin') && (
                        <DropdownMenuItem onClick={() => handleChangePassword(user)}>
                          <KeyRound className="mr-2 h-4 w-4" /> Change Password
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {user.status === 'active' && user.role !== 'superadmin' && (
                         <DropdownMenuItem onClick={() => handleChangeStatus(user, 'inactive')} className="text-orange-600 focus:text-orange-700 focus:bg-orange-500/10">
                          <XCircle className="mr-2 h-4 w-4" /> Deactivate Account
                        </DropdownMenuItem>
                      )}
                      {user.status === 'inactive' && user.role !== 'superadmin' && (
                        <DropdownMenuItem onClick={() => handleChangeStatus(user, 'active')} className="text-green-600 focus:text-green-700 focus:bg-green-500/10">
                          <CheckCircle className="mr-2 h-4 w-4" /> Activate Account
                        </DropdownMenuItem>
                      )}
                      {user.role !== 'superadmin' && ( 
                        <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User Data
                        </DropdownMenuItem>
                      )}
                      {user.role === 'superadmin' && user.id !== auth.currentUser?.uid && (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          Cannot modify other superadmins
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {users.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action: {confirmAction?.actionType.replace('_', ' ').toUpperCase()}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.actionType.replace('_', ' ')} the user 
              <span className="font-semibold"> {confirmAction?.user.name}</span>?
              {confirmAction?.actionType === 'delete' && " This action will delete the user's data from the database but their authentication account may still exist."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConfirmDialog(false); setConfirmAction(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={executeConfirmAction} 
                className={confirmAction?.actionType.includes('delete') || confirmAction?.actionType.includes('deactivate') ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMerchantFormOpen && (
        <MerchantFormDialog
            onSave={handleAddMerchant}
            onClose={() => setIsMerchantFormOpen(false)}
        />
      )}
    </>
  );
}
    

    