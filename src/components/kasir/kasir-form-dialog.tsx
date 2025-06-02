
"use client";

import * as React from "react"; 
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
import { PlusCircle, User as UserIcon, Mail, Lock, Store, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const kasirFormSchemaBase = z.object({
  name: z.string().min(2, { message: "Kasir name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  outlets: z.array(z.string()).min(1, { message: "You have to select at least one outlet." }),
});

const addKasirFormSchema = kasirFormSchemaBase.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const editKasirFormSchema = kasirFormSchemaBase.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal('')),
  confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.password && data.password.length > 0) { 
        return data.password === data.confirmPassword;
    }
    return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type KasirFormValues = z.infer<typeof kasirFormSchemaBase> & {
  password?: string;
  confirmPassword?: string;
};

interface KasirFormDialogProps {
  kasir?: User;
  allOutlets: Outlet[];
  onSave: (data: KasirFormValues, kasirId?: string) => Promise<void>;
  triggerButton?: React.ReactNode; 
  isOpenProp?: boolean;          
  onOpenChangeProp?: (open: boolean) => void; 
}

export function KasirFormDialog({ 
    kasir, 
    allOutlets, 
    onSave, 
    triggerButton, 
    isOpenProp, 
    onOpenChangeProp 
}: KasirFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false); // For self-triggering mode

  const currentFormSchema = kasir ? editKasirFormSchema : addKasirFormSchema;

  const form = useForm<KasirFormValues>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: kasir
      ? { name: kasir.name, email: kasir.email, outlets: kasir.outlets || [], password: '', confirmPassword: '' }
      : { name: "", email: "", password: "", confirmPassword: "", outlets: [] },
  });

  // Determine effective open state and handler
  const effectiveIsOpen = isOpenProp !== undefined ? isOpenProp : internalIsOpen;
  const effectiveOnOpenChange = isOpenProp !== undefined ? onOpenChangeProp : setInternalIsOpen;

  useEffect(() => {
    if (effectiveIsOpen) {
      form.reset(kasir
        ? { name: kasir.name, email: kasir.email, outlets: kasir.outlets || [], password: '', confirmPassword: '' }
        : { name: "", email: "", password: "", confirmPassword: "", outlets: [] }
      );
    }
  }, [effectiveIsOpen, kasir, form]);

  const onSubmit = async (data: KasirFormValues) => {
    setIsLoading(true);
    const submissionData = {
        ...data,
        password: data.password && data.password.length > 0 ? data.password : undefined,
        confirmPassword: data.confirmPassword && data.confirmPassword.length > 0 ? data.confirmPassword : undefined,
    };
    await onSave(submissionData, kasir?.id);
    setIsLoading(false);
    if (form.formState.isSubmitSuccessful && form.formState.isValid && effectiveOnOpenChange) {
        effectiveOnOpenChange(false); 
    }
  };
  
  const handleDialogTriggerClick = () => { // For self-triggering mode's default button
    if (allOutlets.length === 0 && !kasir) {
        return;
    }
    if (effectiveOnOpenChange) effectiveOnOpenChange(true);
  };

  return (
    <Dialog open={effectiveIsOpen} onOpenChange={effectiveOnOpenChange}>
      {isOpenProp === undefined && ( // Only render DialogTrigger if NOT externally controlled
        <DialogTrigger asChild>
          {triggerButton ? (
              React.cloneElement(triggerButton as React.ReactElement<any>, { onClick: () => effectiveOnOpenChange && effectiveOnOpenChange(true) })
          ) : (
            <Button onClick={handleDialogTriggerClick} disabled={allOutlets.length === 0 && !kasir}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Kasir
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{kasir ? "Edit Kasir" : "Add New Kasir"}</DialogTitle>
          <DialogDescription>
            {kasir ? "Update kasir details and outlet access." : "Fill in kasir details and assign outlet access. Password is required for new kasir."}
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
                    <FormControl><Input type="email" placeholder="kasir@example.com" {...field} className="pl-10" disabled={!!kasir} /></FormControl>
                  </div>
                   {kasir && <p className="text-xs text-muted-foreground pt-1">Email cannot be changed for existing kasirs here.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{kasir ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl><Input type="password" placeholder="••••••••" {...field} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            { (form.watch("password") || !kasir) && (
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
                  <div className="mb-2">
                    <FormLabel className="text-base">Outlet Access</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Select the outlets this kasir can access.
                    </p>
                  </div>
                  {allOutlets.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground p-4 border rounded-md">No outlets available to assign. Please add outlets first.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => effectiveOnOpenChange && effectiveOnOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || (allOutlets.length === 0 && !kasir) }>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{kasir ? "Saving..." : "Adding..."}</> : (kasir ? "Save Changes" : "Add Kasir")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
