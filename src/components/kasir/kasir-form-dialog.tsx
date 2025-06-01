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
import { Checkbox } from "@/components/ui/checkbox";
import type { User, Outlet } from "@/types";
import { PlusCircle, User as UserIcon, Mail, Lock, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const kasirFormSchema = z.object({
  name: z.string().min(2, { message: "Kasir name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(), // Optional for edit
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(), // Optional for edit
  outlets: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one outlet.",
  }),
}).refine(data => {
    // Only validate password confirmation if password is provided (for new kasir or password change)
    if (data.password) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


type KasirFormValues = z.infer<typeof kasirFormSchema>;

interface KasirFormDialogProps {
  kasir?: User; // User type, but role will be 'kasir'
  allOutlets: Outlet[]; // All available outlets for the merchant
  onSave: (data: KasirFormValues, kasirId?: string) => Promise<void>;
  triggerButton?: React.ReactNode;
}

export function KasirFormDialog({ kasir, allOutlets, onSave, triggerButton }: KasirFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<KasirFormValues>({
    resolver: zodResolver(kasirFormSchema),
    defaultValues: kasir 
      ? { name: kasir.name, email: kasir.email, outlets: kasir.outlets || [] }
      : { name: "", email: "", password: "", confirmPassword: "", outlets: [] },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(kasir 
        ? { name: kasir.name, email: kasir.email, outlets: kasir.outlets || [], password: '', confirmPassword: '' }
        : { name: "", email: "", password: "", confirmPassword: "", outlets: [] }
      );
    }
  }, [isOpen, kasir, form]);

  const onSubmit = async (data: KasirFormValues) => {
    setIsLoading(true);
    if (!kasir && !data.password) { // If new kasir and password not set (should not happen with validation)
        form.setError("password", { type: "manual", message: "Password is required for new kasir." });
        setIsLoading(false);
        return;
    }
    await onSave(data, kasir?.id);
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Kasir</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{kasir ? "Edit Kasir" : "Add New Kasir"}</DialogTitle>
          <DialogDescription>
            {kasir ? "Update kasir details and outlet access." : "Fill in kasir details and assign outlet access."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input placeholder="Kasir's full name" {...field} className="pl-10" /></FormControl>
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
                  <FormLabel>Email Address</FormLabel>
                   <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input type="email" placeholder="kasir@example.com" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{kasir ? "New Password (Optional)" : "Password"}</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input type="password" placeholder="••••••••" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            { (form.watch("password") || !kasir) && ( // Show confirm password if password field has value OR if it's a new kasir
                 <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                         <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input type="password" placeholder="••••••••" {...field} className="pl-10" /></FormControl>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}
            <FormField
              control={form.control}
              name="outlets"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Outlet Access</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Select the outlets this kasir can access.
                    </p>
                  </div>
                  <ScrollArea className="h-40 rounded-md border p-4">
                    {allOutlets.map((outlet) => (
                      <FormField
                        key={outlet.id}
                        control={form.control}
                        name="outlets"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={outlet.id}
                              className="flex flex-row items-start space-x-3 space-y-0 mb-3"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(outlet.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), outlet.id])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== outlet.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                <Store className="h-4 w-4 text-muted-foreground"/> {outlet.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (kasir ? "Saving..." : "Adding...") : (kasir ? "Save Changes" : "Add Kasir")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
