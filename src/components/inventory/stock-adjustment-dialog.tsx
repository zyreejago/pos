
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Warehouse, Edit, Loader2 } from 'lucide-react';

const stockAdjustmentFormSchema = z.object({
  newStock: z.coerce.number().min(0, { message: "Stock must be a non-negative number." }),
  reason: z.string().min(3, { message: "Reason must be at least 3 characters." }).optional(),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>;

interface StockAdjustmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  unitName: string;
  currentStock: number;
  onSave: (newStock: number, reason?: string) => Promise<void>;
}

export function StockAdjustmentDialog({
  isOpen,
  onOpenChange,
  productName,
  unitName,
  currentStock,
  onSave,
}: StockAdjustmentDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: {
      newStock: currentStock,
      reason: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        newStock: currentStock,
        reason: "",
      });
    }
  }, [isOpen, currentStock, form]);

  const onSubmit = async (data: StockAdjustmentFormValues) => {
    setIsSaving(true);
    try {
      await onSave(data.newStock, data.reason);
      onOpenChange(false); 
    } catch (error) {
      // Error should be handled by the parent via toast, if necessary
      console.error("Failed to save stock adjustment from dialog:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center">
            <Edit className="mr-2 h-5 w-5 text-primary" /> Adjust Stock: {productName} ({unitName})
          </DialogTitle>
          <DialogDescription>
            Current stock: <span className="font-semibold">{currentStock}</span>. Enter the new stock quantity for this unit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="newStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Stock Quantity</FormLabel>
                  <div className="relative">
                    <Warehouse className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" placeholder="Enter new stock" {...field} className="pl-10" autoFocus />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Adjustment (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Initial stock, Stock opname, Damaged goods" {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
