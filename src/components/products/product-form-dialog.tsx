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
import { useState } from "react";

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
  units: z.array(unitSchema).min(1, "At least one unit is required."),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormDialogProps {
  product?: Product;
  suppliers: Supplier[]; // Mock or fetched suppliers
  onSave: (data: ProductFormValues) => Promise<void>;
  triggerButton?: React.ReactNode;
}

export function ProductFormDialog({ product, suppliers, onSave, triggerButton }: ProductFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? 
      { ...product, units: product.units || [{ name: 'pcs', price: 0, stock: 0, isBaseUnit: true }] } : 
      {
        name: "",
        buyOwn: false,
        units: [{ name: 'pcs', price: 0, stock: 0, isBaseUnit: true, conversionFactor: 1 }],
      },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "units",
  });

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    await onSave(data);
    setIsLoading(false);
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium font-headline">Units & Pricing</h3>
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, stock: 0, isBaseUnit: false, conversionFactor: 1 })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Unit
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-t pt-3 first:border-t-0 first:pt-0">
                  <FormField
                    control={form.control}
                    name={`units.${index}.name`}
                    render={({ field: unitField }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>Unit Name</FormLabel>
                        <FormControl><Input placeholder="e.g., pcs, dus, pack" {...unitField} /></FormControl>
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
                      <FormItem className="md:col-span-3">
                        <FormLabel>Stock</FormLabel>
                        <div className="relative">
                            <Warehouse className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl><Input type="number" placeholder="100" {...unitField} className="pl-10" /></FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 
                  {fields.length > 1 && (
                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="md:col-span-1 self-end text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                     </Button>
                  )}
                   <div className="col-span-full"><FormMessage>{form.formState.errors.units?.[index]?.root?.message}</FormMessage></div>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                             <PackageSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <span className="pl-5"><SelectValue placeholder="Select a supplier" /></span>
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        <SelectItem value="add_new_supplier">Add New Supplier...</SelectItem>
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
                      Beli Sendiri (Purchased directly, not from listed supplier)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (product ? "Saving..." : "Adding...") : (product ? "Save Changes" : "Add Product")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
