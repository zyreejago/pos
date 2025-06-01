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
import type { Outlet } from "@/types";
import { PlusCircle, Store, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

const outletFormSchema = z.object({
  name: z.string().min(2, { message: "Outlet name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

interface OutletFormDialogProps {
  outlet?: Outlet;
  onSave: (data: OutletFormValues) => Promise<void>;
  triggerButton?: React.ReactNode;
}

export function OutletFormDialog({ outlet, onSave, triggerButton }: OutletFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: outlet || {
      name: "",
      address: "",
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset(outlet || { name: "", address: "" });
    }
  }, [isOpen, outlet, form]);


  const onSubmit = async (data: OutletFormValues) => {
    setIsLoading(true);
    await onSave(data);
    setIsLoading(false);
    setIsOpen(false);
    form.reset(); // Reset form after successful submission
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Outlet</Button>}
      </DialogTrigger>
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
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (outlet ? "Saving..." : "Adding...") : (outlet ? "Save Changes" : "Add Outlet")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
