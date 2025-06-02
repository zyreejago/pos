
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
import type { SystemSettings } from "@/types"; // User type not directly used here anymore
import { Percent, Tag, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

const settingsFormSchema = z.object({
  ppnRate: z.coerce.number().min(0, "PPN rate must be non-negative.").max(100, "PPN rate cannot exceed 100."),
  discountRate: z.coerce.number().min(0, "Discount rate must be non-negative.").max(100, "Discount rate cannot exceed 100."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
}

const readCurrentUserFromStorage = (): StoredUser | null => {
  if (typeof window !== 'undefined') {
    const storedUserStr = localStorage.getItem('mockUser');
    if (storedUserStr) {
      try {
        return JSON.parse(storedUserStr) as StoredUser;
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        return null;
      }
    }
  }
  return null;
};

const defaultSettings: SettingsFormValues = {
  ppnRate: 0,
  discountRate: 0,
};

export function SettingsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const user = readCurrentUserFromStorage();
    setCurrentUser(user);
    setIsUserLoaded(true);
  }, []); // Runs once on mount to load user from storage

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultSettings,
  });

  const fetchSettings = useCallback(async () => {
    if (!isUserLoaded) return; // Don't fetch if user hasn't been loaded from storage yet

    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Merchant information not found. Cannot load settings.", variant: "destructive" });
      setIsFetching(false);
      form.reset(defaultSettings);
      return;
    }

    setIsFetching(true);
    try {
      const settingsRef = doc(db, "settings", currentUser.merchantId);
      const docSnap = await getDoc(settingsRef);

      if (docSnap.exists()) {
        form.reset(docSnap.data() as SettingsFormValues);
      } else {
        form.reset(defaultSettings);
        console.log("No settings document found for merchant, using defaults.");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({ title: "Fetch Failed", description: "Could not load system settings.", variant: "destructive" });
      form.reset(defaultSettings);
    }
    setIsFetching(false);
  }, [currentUser, form, toast, isUserLoaded]); // Added isUserLoaded

  useEffect(() => {
    if (isUserLoaded) { // Only fetch settings if user data has been attempted to be loaded
      fetchSettings();
    }
  }, [fetchSettings, isUserLoaded]); // Added isUserLoaded

  async function onSubmit(values: SettingsFormValues) {
    if (!currentUser || !currentUser.merchantId) {
      toast({ title: "Error", description: "Cannot save settings. Merchant information missing.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const settingsRef = doc(db, "settings", currentUser.merchantId);
      await setDoc(settingsRef, values, { merge: true });

      toast({
        title: "Settings Saved!",
        description: "Your PPN and discount rates have been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Save Failed", description: "Could not save system settings.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  if (!isUserLoaded || (isFetching && !form.formState.isDirty)) { // Show loader if user not loaded OR fetching initial data
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">
          {!isUserLoaded ? "Loading user data..." : "Loading settings..."}
        </p>
      </div>
    );
  }
  
  if (isUserLoaded && !currentUser) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Transaction Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center">User not identified. Please log in to manage settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (isUserLoaded && currentUser && !currentUser.merchantId) {
     return (
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Transaction Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center">Merchant information not found for your account. Cannot manage settings.</p>
        </CardContent>
      </Card>
    );
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
              <Button type="submit" className="font-headline" disabled={isLoading || !currentUser?.merchantId}>
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
