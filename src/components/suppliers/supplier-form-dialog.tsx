
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
import { useState, useEffect } from "react"; // Changed this line

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters." }),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormDialogProps {
  supplier?: Supplier;
  onSave: (data: SupplierFormValues) => Promise<void>;
  triggerButton?: React.ReactNode;
}

export function SupplierFormDialog({ supplier, onSave, triggerButton }: SupplierFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const onSubmit = async (data: SupplierFormValues) => {
    setIsLoading(true);
    await onSave(data);
    setIsLoading(false);
    setIsOpen(false);
    form.reset(supplier || { name: "", contactPerson: "", phone: "", email: "", address: "" });
  };
  
  // Effect to reset form when supplier prop changes (e.g. when opening dialog for different supplier)
  // or when dialog opens for new supplier after editing one
  useEffect(() => { // Changed this line
    if (isOpen) {
      form.reset(supplier || {
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
      });
    }
  }, [isOpen, supplier, form]);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>}
      </DialogTrigger>
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
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (supplier ? "Saving..." : "Adding...") : (supplier ? "Save Changes" : "Add Supplier")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
