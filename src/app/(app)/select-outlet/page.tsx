
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Added Link import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, PlusCircle } from 'lucide-react'; // Added PlusCircle
import type { Outlet } from '@/types';

const APP_OUTLETS_STORAGE_KEY = 'tokoAppMockOutlets';

// Default outlets if localStorage is empty or invalid
const defaultSeedOutlets: Outlet[] = [
  { id: "outlet_1", name: "Main Outlet", address: "Jl. Sudirman No. 123, Jakarta Pusat", merchantId: "merch_1" },
  { id: "outlet_2", name: "Branch Kemang", address: "Jl. Kemang Raya No. 45, Jakarta Selatan", merchantId: "merch_1" },
  { id: "outlet_3", name: "Warehouse Cilandak", address: "Jl. TB Simatupang Kav. 6, Jakarta Selatan", merchantId: "merch_1" },
];

const getStoredOutlets = (): Outlet[] => {
  if (typeof window === 'undefined') {
    return defaultSeedOutlets;
  }
  const stored = localStorage.getItem(APP_OUTLETS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : defaultSeedOutlets;
    } catch (e) {
      console.error("Failed to parse outlets from localStorage on select page", e);
      localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(defaultSeedOutlets));
      return defaultSeedOutlets;
    }
  } else {
    // Seed localStorage if it's empty
    localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(defaultSeedOutlets));
    return defaultSeedOutlets;
  }
};


export default function SelectOutletPage() {
  const router = useRouter();
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAvailableOutlets(getStoredOutlets());

      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        try {
          const mockUser = JSON.parse(mockUserStr);
          if (mockUser.role === 'superadmin') {
            router.push('/admin/users');
            return;
          }
        } catch (e) {
          console.error("Error parsing mockUser for outlet selection:", e);
          // Potentially clear corrupted user data and redirect to login
          localStorage.removeItem('mockUser');
          localStorage.removeItem('selectedOutletId');
          localStorage.removeItem('selectedOutletName');
          router.push('/login');
          return;
        }
      }
      // No need to redirect if an outlet is already selected here,
      // user might be intentionally navigating to change outlet.
      // The AppLayout handles protection for other pages.
    }
  }, [router]);

  const handleSelectOutlet = (outlet: Outlet) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
    }
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <Store className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-headline">Select Your Outlet</CardTitle>
          <CardDescription>
            Choose the outlet you want to manage or operate from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableOutlets.map((outlet) => (
            <Button
              key={outlet.id}
              variant="outline"
              className="w-full h-auto p-6 flex justify-between items-center text-left hover:bg-accent/50 hover:shadow-md transition-all duration-200"
              onClick={() => handleSelectOutlet(outlet)}
            >
              <div className="flex items-center gap-4">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-lg font-semibold font-headline">{outlet.name}</p>
                  <p className="text-sm text-muted-foreground">{outlet.address}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          ))}
          {availableOutlets.length === 0 && (
            <p className="text-center text-muted-foreground py-6">
              No outlets available for selection.
            </p>
          )}
           <Button variant="ghost" asChild className="w-full mt-6 text-primary hover:text-primary/90 hover:bg-primary/10">
            <Link href="/outlets">
              <PlusCircle className="mr-2 h-4 w-4" />
              Manage / Add Outlets
            </Link>
          </Button>
        </CardContent>
      </Card>
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Need to switch outlets later? You can do so from the header menu.
      </p>
    </div>
  );
}
