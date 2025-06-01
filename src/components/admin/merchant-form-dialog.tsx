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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User as UserIcon, Mail, Lock, Store } from "lucide-react";
import { useState, useEffect } from "react";

const merchantFormSchema = z.object({
  name: z.string().min(2, { message: "Merchant name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email for the admin user." }),
  password: z.string().min(6, { message: "Admin password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type MerchantFormValues = z.infer<typeof merchantFormSchema>;

interface MerchantFormDialogProps {
  onSave: (data: MerchantFormValues) => Promise<void>;
  onClose: () => void; // To control dialog visibility from parent
}

export function MerchantFormDialog({ onSave, onClose }: MerchantFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: MerchantFormValues) => {
    setIsLoading(true);
    await onSave(data);
    setIsLoading(false);
    form.reset();
    // onClose will be called by parent to close dialog after onSave promise resolves
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}> {/* Controlled dialog */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Add New Merchant</DialogTitle>
          <DialogDescription>
            Create a new merchant account. The merchant will be active immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant Name</FormLabel>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input placeholder="e.g., Toko Maju Jaya" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Email</FormLabel>
                   <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input type="email" placeholder="admin@merchant.com" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormDescription>Email for the primary admin user of this merchant.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Password</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input type="password" placeholder="••••••••" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Confirm Admin Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl><Input type="password" placeholder="••••••••" {...field} className="pl-10" /></FormControl>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding Merchant..." :  "Add Merchant & Activate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
