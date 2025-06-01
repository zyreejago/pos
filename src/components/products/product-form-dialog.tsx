
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, Supplier } from "@/types";
import { PlusCircle, Trash2, Package, Tag, Warehouse, Barcode, DollarSign, PackageSearch } from "lucide-react";
import { useState, useEffect } from "react"; 
import { db, serverTimestamp } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";


const unitSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  stock: z.coerce.number().min(0, "Stock must be non-negative"),
  isBaseUnit: z.boolean().optional(),
  conversionFactor: z.coerce.number().min(1, "Factor must be at least 1").optional(),
});

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  supplierId: z.string().optional(),
  buyOwn: z.boolean().default(false),
  barcode: z.string().optional(),
  units: z.array(unitSchema).min(1, "At least one unit is required.")
    .refine(units => {
        const baseUnits = units.filter(u => u.isBaseUnit).length;
        if (units.length > 0 && baseUnits === 0) return false; 
        if (baseUnits > 1) return false; 
        return true;
    }, {
        message: "Each product must have exactly one base unit (check 'Is Base Unit'). If only one unit, it's the base.",
    }),
});


type ProductFormValues = z.infer<typeof productFormSchema>;

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
        console.error("Failed to parse user from localStorage in ProductFormDialog", e);
        return null;
      }
    }
  }
  return null;
};

interface ProductFormDialogProps {
  product?: Product;
  suppliers: Supplier[]; 
  onSaveSuccess: () => void; 
  triggerButton?: React.ReactNode;
  isOpenProp?: boolean;
  onOpenChangeProp?: (open: boolean) => void;
}

const NO_SUPPLIER_VALUE = "_none_";

export function ProductFormDialog({ 
    product, 
    suppliers, 
    onSaveSuccess, 
    triggerButton,
    isOpenProp,
    onOpenChangeProp 
}: ProductFormDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(isOpenProp !== undefined ? isOpenProp : false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? 
      { ...product, supplierId: product.supplierId || NO_SUPPLIER_VALUE, units: product.units || [{ name: 'pcs', price: 0, stock: 0, isBaseUnit: true, conversionFactor: 1 }] } : 
      {
        name: "",
        supplierId: NO_SUPPLIER_VALUE,
        buyOwn: false,
        barcode: "",
        units: [{ name: '', price: 0, stock: 0, isBaseUnit: true, conversionFactor: 1 }],
      },
  });

  const { fields, append, remove, update } = useFieldArray({ 
    control: form.control,
    name: "units",
  });

  useEffect(() => {
    if (isOpenProp !== undefined) {
      setIsDialogOpen(isOpenProp);
    }
  }, [isOpenProp]);

  useEffect(() => {
    if (isDialogOpen) {
      const initialUnits = product?.units && product.units.length > 0 
        ? product.units 
        : [{ name: '', price: 0, stock: 0, isBaseUnit: true, conversionFactor: 1 }];
      
      form.reset({
        name: product?.name || "",
        supplierId: product?.supplierId || NO_SUPPLIER_VALUE, 
        buyOwn: product?.buyOwn || false,
        barcode: product?.barcode || "",
        units: initialUnits,
      });
      
      if (initialUnits.length > 0 && !initialUnits.some(u => u.isBaseUnit)) {
        const updatedUnits = initialUnits.map((u, i) => i === 0 ? { ...u, isBaseUnit: true } : u);
        form.setValue('units', updatedUnits);
      }
    }
  }, [isDialogOpen, product, form]);


  const handleOpenChange = (open: boolean) => {
    if (onOpenChangeProp) {
      onOpenChangeProp(open);
    } else {
      setIsDialogOpen(open);
    }
  };

  const handleBaseUnitChange = (changedIndex: number, checked: boolean) => {
    const currentUnits = form.getValues('units');
    currentUnits.forEach((unit, index) => {
        update(index, { ...unit, isBaseUnit: index === changedIndex ? checked : false });
    });
  };

  const onSubmit = async (formData: ProductFormValues) => {
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Merchant information not found. Please re-login.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const processedUnits = formData.units.map(unit => ({
        ...unit,
        conversionFactor: unit.isBaseUnit ? 1 : (unit.conversionFactor || 1),
    }));

    // Prepare data for Firestore, explicitly excluding undefined optional fields
    const dataForFirestore: {
        name: string;
        units: typeof processedUnits;
        merchantId: string;
        buyOwn: boolean;
        supplierId?: string;
        barcode?: string;
        // Timestamps will be added by Firestore
    } = {
        name: formData.name,
        units: processedUnits,
        merchantId: currentUser.merchantId,
        buyOwn: formData.buyOwn,
    };

    if (formData.supplierId && formData.supplierId !== NO_SUPPLIER_VALUE && formData.supplierId.trim() !== "") {
        dataForFirestore.supplierId = formData.supplierId;
    }

    if (formData.barcode && formData.barcode.trim() !== "") {
        dataForFirestore.barcode = formData.barcode.trim();
    }

    try {
      if (product) { 
        const productRef = doc(db, "products", product.id);
        await updateDoc(productRef, {
          ...dataForFirestore,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Product Updated", description: `Product ${formData.name} has been updated.` });
      } else { 
        await addDoc(collection(db, "products"), {
          ...dataForFirestore,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Product Added", description: `Product ${formData.name} has been added.` });
      }
      onSaveSuccess();
      handleOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving product: ", error);
       if (error instanceof Error && 'code' in error) { 
        toast({ title: "Save Failed", description: `Firestore error: ${error.message}. Code: ${(error as any).code}`, variant: "destructive", duration: 7000 });
      } else {
        toast({ title: "Save Failed", description: "Could not save product data. Please try again.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  };
  
  const dialogTrigger = triggerButton ? triggerButton : <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {triggerButton && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update the details of this product." : "Fill in the details for the new product."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g., Kopi Susu Gula Aren" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-md border p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium font-headline">Units & Pricing</h3>
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, stock: 0, isBaseUnit: fields.length === 0, conversionFactor: 1 })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Unit
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-x-3 gap-y-4 items-start border-t pt-4 first:border-t-0 first:pt-0">
                  <FormField
                    control={form.control}
                    name={`units.${index}.name`}
                    render={({ field: unitField }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>Unit Name</FormLabel>
                        <FormControl><Input placeholder="e.g., pcs, dus" {...unitField} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`units.${index}.price`}
                    render={({ field: unitField }) => (
                       <FormItem className="md:col-span-3">
                        <FormLabel>Price (IDR)</FormLabel>
                         <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input type="number" placeholder="15000" {...unitField} className="pl-10" /></FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`units.${index}.stock`}
                    render={({ field: unitField }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Stock</FormLabel>
                        <div className="relative">
                            <Warehouse className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input type="number" placeholder="100" {...unitField} className="pl-10" /></FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`units.${index}.isBaseUnit`}
                    render={({ field: unitField }) => (
                      <FormItem className="md:col-span-2 flex flex-col items-start pt-1">
                        <FormLabel className="mb-[10px]">Base Unit?</FormLabel>
                        <FormControl>
                           <Checkbox
                            checked={unitField.value}
                            onCheckedChange={(checked) => handleBaseUnitChange(index, !!checked)}
                            disabled={fields.length === 1 && index === 0} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   {!form.watch(`units.${index}.isBaseUnit`) && (
                    <FormField
                        control={form.control}
                        name={`units.${index}.conversionFactor`}
                        render={({ field: unitField }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>To Base Qty</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 12" {...unitField} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  )}
                 
                  {fields.length > 1 && (
                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="md:col-span-1 self-center mt-6 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove unit</span>
                     </Button>
                  )}
                </div>
              ))}
               <FormMessage>{form.formState.errors.units?.root?.message || form.formState.errors.units?.message}</FormMessage>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || NO_SUPPLIER_VALUE}>
                        <FormControl>
                        <SelectTrigger>
                             <PackageSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <span className="pl-5"><SelectValue placeholder="Select a supplier" /></span>
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_SUPPLIER_VALUE}>None</SelectItem>
                          {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode (Optional)</FormLabel>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Enter barcode" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="buyOwn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Beli Sendiri (Product is sourced directly, not from a listed supplier)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !currentUser}>
                {isLoading ? (product ? "Saving..." : "Adding...") : (product ? "Save Changes" : "Add Product")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

