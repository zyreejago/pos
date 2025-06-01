
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
  // DialogTrigger, // No longer needed if always controlled externally for this context
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
import type { Outlet as OutletType } from "@/types";
import { Store, MapPin } from "lucide-react"; // PlusCircle removed as trigger is external
import { useState, useEffect } from "react";
import { db, serverTimestamp } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const outletFormSchema = z.object({
  name: z.string().min(2, { message: "Outlet name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

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
        console.error("Failed to parse user from localStorage in OutletFormDialog", e);
        return null;
      }
    }
  }
  return null;
};

interface OutletFormDialogProps {
  outlet?: OutletType;
  onSaveSuccess: () => void;
  isOpenProp: boolean; // Make this required if dialog is always controlled
  onOpenChangeProp: (open: boolean) => void; // Make this required
}

export function OutletFormDialog({ 
    outlet, 
    onSaveSuccess, 
    isOpenProp,
    onOpenChangeProp 
}: OutletFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const currentUser = getCurrentUser(); // Use this for merchantId

  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: outlet || {
      name: "",
      address: "",
    },
  });
  
  useEffect(() => {
    console.log("[OutletFormDialog] Effect triggered. isOpenProp:", isOpenProp, "Outlet:", outlet?.name);
    if (isOpenProp) {
      console.log("[OutletFormDialog] isOpenProp is true, resetting form with outlet:", outlet ? outlet.name : "new outlet");
      form.reset(outlet || { name: "", address: "" });
    }
  }, [isOpenProp, outlet, form]);


  const onSubmit = async (data: OutletFormValues) => {
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Merchant information not found. Please re-login.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    console.log("[OutletFormDialog] Submitting form with data:", data);
    try {
      if (outlet) {
        console.log("[OutletFormDialog] Updating existing outlet:", outlet.id);
        const outletRef = doc(db, "outlets", outlet.id);
        await updateDoc(outletRef, { ...data });
        toast({ title: "Outlet Updated", description: `Outlet ${data.name} has been updated.` });
      } else {
        console.log("[OutletFormDialog] Adding new outlet for merchantId:", currentUser.merchantId);
        await addDoc(collection(db, "outlets"), {
          ...data,
          merchantId: currentUser.merchantId,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Outlet Added", description: `Outlet ${data.name} has been added.` });
      }
      onSaveSuccess();
      onOpenChangeProp(false); // Signal to parent to close
    } catch (error) {
      console.error("[OutletFormDialog] Error saving outlet: ", error);
      toast({ title: "Save Failed", description: "Could not save outlet data. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  console.log("[OutletFormDialog] Rendering. isOpenProp:", isOpenProp);

  // If not open, don't render the dialog structure at all to be safe,
  // though <Dialog open={false}> should just hide it.
  if (!isOpenProp) {
    return null;
  }

  return (
    <Dialog open={isOpenProp} onOpenChange={onOpenChangeProp}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{outlet ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
          <DialogDescription>
            {outlet ? "Update the details for this outlet." : "Fill in the details for the new outlet."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outlet Name</FormLabel>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g., Main Branch, Warehouse Kopi" {...field} className="pl-10" />
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
                  <FormLabel>Address</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Textarea placeholder="Full address of the outlet" {...field} className="pl-10 min-h-[100px]" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChangeProp(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !currentUser?.merchantId}>
                {isLoading ? (outlet ? "Saving..." : "Adding...") : (outlet ? "Save Changes" : "Add Outlet")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
