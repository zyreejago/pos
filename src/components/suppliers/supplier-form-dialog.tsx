
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier } from "@/types";
import { PlusCircle, Truck, User, Phone, Mail, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { db, serverTimestamp } from '@/lib/firebase'; // Import db and serverTimestamp
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'; // Import Firestore functions
import { useToast } from "@/hooks/use-toast";

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters." }),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

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
        console.error("Failed to parse user from localStorage in SupplierFormDialog", e);
        return null;
      }
    }
  }
  return null;
};

interface SupplierFormDialogProps {
  supplier?: Supplier;
  onSaveSuccess: () => void; // Changed from onSave
  triggerButton?: React.ReactNode; // This will be used if dialog is self-triggered
  isOpenProp?: boolean; // New prop to control dialog externally
  onOpenChangeProp?: (open: boolean) => void; // New prop to control dialog externally
}

export function SupplierFormDialog({ 
    supplier, 
    onSaveSuccess, 
    triggerButton,
    isOpenProp,
    onOpenChangeProp
}: SupplierFormDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(isOpenProp !== undefined ? isOpenProp : false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier || {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // Effect to sync dialog state if controlled externally
  useEffect(() => {
    if (isOpenProp !== undefined) {
      setIsDialogOpen(isOpenProp);
    }
  }, [isOpenProp]);

  // Effect to reset form when supplier prop changes or dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      form.reset(supplier || {
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
      });
    }
  }, [isDialogOpen, supplier, form]);

  const handleOpenChange = (open: boolean) => {
    if (onOpenChangeProp) {
      onOpenChangeProp(open);
    } else {
      setIsDialogOpen(open);
    }
  };

  const onSubmit = async (data: SupplierFormValues) => {
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Merchant information not found. Please re-login.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (supplier) { // Editing existing supplier
        const supplierRef = doc(db, "suppliers", supplier.id);
        await updateDoc(supplierRef, {
          ...data,
          // updatedAt: serverTimestamp(), // Add if you have an updatedAt field in your Supplier type
        });
        toast({ title: "Supplier Updated", description: `Supplier ${data.name} has been updated.` });
      } else { // Adding new supplier
        await addDoc(collection(db, "suppliers"), {
          ...data,
          merchantId: currentUser.merchantId,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Supplier Added", description: `Supplier ${data.name} has been added.` });
      }
      onSaveSuccess();
      handleOpenChange(false); // Close dialog
      form.reset(); // Reset form for next use
    } catch (error) {
      console.error("Error saving supplier: ", error);
      toast({ title: "Save Failed", description: "Could not save supplier data. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const dialogTrigger = triggerButton ? triggerButton : <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {triggerButton && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{supplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          <DialogDescription>
            {supplier ? "Update the details for this supplier." : "Fill in the details for the new supplier."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <div className="relative">
                     <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g., PT Sumber Rejeki" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Person (Optional)</FormLabel>
                     <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                        <Input placeholder="John Doe" {...field} className="pl-10" />
                        </FormControl>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                        <Input placeholder="0812xxxxxxxx" {...field} className="pl-10" />
                        </FormControl>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                   <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                        <Input type="email" placeholder="supplier@example.com" {...field} className="pl-10" />
                        </FormControl>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                   <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                        <Textarea placeholder="Full address of the supplier" {...field} className="pl-10 min-h-[80px]" />
                        </FormControl>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !currentUser}>
                {isLoading ? (supplier ? "Saving..." : "Adding...") : (supplier ? "Save Changes" : "Add Supplier")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
