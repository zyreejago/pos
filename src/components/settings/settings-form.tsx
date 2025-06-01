"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemSettings } from "@/types";
import { Percent, Tag } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const settingsFormSchema = z.object({
  ppnRate: z.coerce.number().min(0, "PPN rate must be non-negative.").max(100, "PPN rate cannot exceed 100."),
  discountRate: z.coerce.number().min(0, "Discount rate must be non-negative.").max(100, "Discount rate cannot exceed 100."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

// Mock current settings
const currentSettings: SystemSettings = {
  ppnRate: 11, // 11%
  discountRate: 5, // 5%
};

export function SettingsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: currentSettings,
  });

  async function onSubmit(values: SettingsFormValues) {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Settings updated:", values);
    // Update currentSettings mock (in a real app, this would be state or refetched)
    currentSettings.ppnRate = values.ppnRate;
    currentSettings.discountRate = values.discountRate;
    
    setIsLoading(false);
    toast({
      title: "Settings Saved!",
      description: "Your PPN and discount rates have been updated.",
    });
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Transaction Settings</CardTitle>
        <CardDescription>
          Configure default PPN (VAT) and discount rates that will be applied to transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="ppnRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PPN Rate (%)</FormLabel>
                  <div className="relative">
                     <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" placeholder="e.g., 11 for 11%" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormDescription>
                    The default PPN (Pajak Pertambahan Nilai) rate applied to sales.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Discount Rate (%)</FormLabel>
                   <div className="relative">
                     <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5 for 5%" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormDescription>
                    A general discount rate automatically applied (can be overridden per transaction).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" className="font-headline" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
