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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, KeyRound, CheckCircle, XCircle, UserPlus, Store } from "lucide-react";
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
import { MerchantFormDialog } from './merchant-form-dialog'; // Assuming a separate dialog for adding merchants

// Mock data representing all users
const mockAllUsers: User[] = [
  { id: "user_merchant_1", name: "Toko Sejahtera", email: "sejahtera@example.com", role: "admin", status: "active", merchantId: "merchant_1" },
  { id: "user_kasir_1_1", name: "Andi Setiawan (Sejahtera)", email: "andi.s@sejahtera.com", role: "kasir", status: "active", merchantId: "merchant_1", outlets: ["outlet_A_1"] },
  { id: "user_merchant_2", name: "Warung Barokah", email: "barokah@example.com", role: "admin", status: "pending_approval", merchantId: "merchant_2" },
  { id: "user_superadmin_1", name: "Super Admin", email: "super@tokoapp.com", role: "superadmin", status: "active" },
  { id: "user_merchant_3", name: "Cafe Senja", email: "senja@example.com", role: "admin", status: "inactive", merchantId: "merchant_3" },
  { id: "user_kasir_3_1", name: "Rina (Senja)", email: "rina@senja.com", role: "kasir", status: "active", merchantId: "merchant_3", outlets: ["outlet_C_1"] },
];


export function UserManagementTable() {
  const [users, setUsers] = useState<User[]>(mockAllUsers);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined); // For editing via a generic user form (if any)
  const [isMerchantFormOpen, setIsMerchantFormOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ user: User; actionType: 'approve' | 'deactivate' | 'activate' | 'delete' } | null>(null);
  const { toast } = useToast();

  const handleApproveMerchant = (user: User) => {
    setConfirmAction({ user, actionType: 'approve' });
    setShowConfirmDialog(true);
  };

  const handleChangeStatus = (user: User, newStatus: 'active' | 'inactive') => {
     setConfirmAction({ user, actionType: newStatus === 'active' ? 'activate' : 'deactivate' });
     setShowConfirmDialog(true);
  };
  
  const handleDeleteUser = (user: User) => {
    setConfirmAction({ user, actionType: 'delete' });
    setShowConfirmDialog(true);
  };

  const executeConfirmAction = () => {
    if (!confirmAction) return;
    const { user, actionType } = confirmAction;

    let newUserStatus: User['status'] | undefined;
    let toastMessage = "";

    switch (actionType) {
        case 'approve':
            newUserStatus = 'active';
            toastMessage = `Merchant ${user.name} has been approved and activated.`;
            break;
        case 'activate':
            newUserStatus = 'active';
            toastMessage = `User ${user.name} has been activated.`;
            break;
        case 'deactivate':
            newUserStatus = 'inactive';
            toastMessage = `User ${user.name} has been deactivated.`;
            break;
        case 'delete':
            setUsers(users.filter(u => u.id !== user.id));
            toast({ title: "User Deleted", description: `User ${user.name} has been permanently deleted.`, variant: "destructive" });
            setShowConfirmDialog(false);
            setConfirmAction(null);
            return; // Early return for delete as it modifies the array differently
    }
    
    if (newUserStatus) {
        setUsers(users.map(u => u.id === user.id ? { ...u, status: newUserStatus! } : u));
        toast({ title: "Action Successful", description: toastMessage });
    }

    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const handleChangePassword = (user: User) => {
    // Placeholder for password change functionality (usually involves a secure form/dialog)
    toast({ title: "Password Change Initiated", description: `Password change process for ${user.name} has started. (Not implemented)` });
  };
  
  const handleAddMerchant = async (data: { name: string, email: string, password?: string }) => {
     return new Promise<void>((resolve) => {
        setTimeout(() => {
            const newMerchant: User = {
                id: `merchant_${Date.now()}`,
                name: data.name,
                email: data.email,
                role: 'admin', // Merchant admin
                status: 'active', // Directly active
                merchantId: `merchant_${Date.now()}` // Assign a new merchantId
            };
            setUsers([newMerchant, ...users]);
            toast({ title: "Merchant Added", description: `Merchant ${newMerchant.name} has been added and activated.` });
            setIsMerchantFormOpen(false);
            resolve();
        }, 500);
    });
  };
  
  const getStatusBadgeVariant = (status: User['status']) => {
    if (status === 'active') return 'default'; // default is often green-ish or primary
    if (status === 'pending_approval') return 'secondary'; // secondary can be yellow/orange like
    if (status === 'inactive') return 'destructive';
    return 'outline';
  };
  
  const getRoleDisplayName = (role: UserRole) => {
    switch(role) {
        case 'superadmin': return 'Super Admin';
        case 'admin': return 'Merchant Admin';
        case 'kasir': return 'Kasir';
        default: return role;
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsMerchantFormOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Merchant
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
              <TableHead className="font-headline">Merchant ID</TableHead>
              <TableHead className="text-right font-headline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                    <Badge variant="outline" className="capitalize">{getRoleDisplayName(user.role)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)} className="capitalize bg-opacity-20 border-opacity-50">
                    {user.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{user.merchantId || 'N/A (Superadmin)'}</TableCell>
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
                      {/* <DropdownMenuItem onClick={() => {}}> // Edit User details (if a generic form exists)
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Details 
                      </DropdownMenuItem> */}
                      {(user.role === 'admin' || user.role === 'superadmin') && ( // Allow password change for admin/superadmin
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
                      {user.role !== 'superadmin' && ( // Superadmin cannot be deleted
                        <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
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
              {confirmAction?.actionType === 'delete' && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
