
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight } from 'lucide-react';
import type { Outlet } from '@/types';

// Mock data for outlets - consistent with other parts of the app
// In a real app, this would be fetched based on user's merchantId
const mockAppOutlets: Outlet[] = [
  { id: "outlet_1", name: "Main Outlet", address: "Jl. Sudirman No. 123, Jakarta Pusat", merchantId: "merch_1" },
  { id: "outlet_2", name: "Branch Kemang", address: "Jl. Kemang Raya No. 45, Jakarta Selatan", merchantId: "merch_1" },
  { id: "outlet_3", name: "Warehouse Cilandak", address: "Jl. TB Simatupang Kav. 6, Jakarta Selatan", merchantId: "merch_1" },
  { id: "outlet_4", name: "Toko App Bandung", address: "Jl. Asia Afrika No. 1, Bandung", merchantId: "merch_2" },
];

export default function SelectOutletPage() {
  const router = useRouter();

  // Redirect if user is superadmin or if an outlet is already selected (e.g. navigating back)
  useEffect(() => {
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
      }
    }
    // If an outlet is already selected and they land here, send to dashboard.
    // This handles cases like browser back button after selection.
    // const selectedOutletId = localStorage.getItem('selectedOutletId');
    // if (selectedOutletId) {
    //   router.push('/dashboard');
    // }
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
          {mockAppOutlets.map((outlet) => (
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
          {mockAppOutlets.length === 0 && (
            <p className="text-center text-muted-foreground">No outlets available for selection.</p>
          )}
        </CardContent>
      </Card>
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Need to switch outlets later? You can do so from the header menu.
      </p>
    </div>
  );
}
