
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, PlusCircle, Loader2 } from 'lucide-react';
import type { Outlet } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  merchantId?: string;
  status?: 'active' | 'pending_approval' | 'inactive';
}

const getCurrentUser = (): StoredUser | null => {
  if (typeof window !== 'undefined') {
    const storedUserStr = localStorage.getItem('mockUser');
    if (storedUserStr) {
      try {
        return JSON.parse(storedUserStr) as StoredUser;
      } catch (e) {
        console.error("Failed to parse user from localStorage in SelectOutletPage", e);
        return null;
      }
    }
  }
  return null;
};

export default function SelectOutletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Default to true
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    console.log('[SelectOutletPage] Initializing, attempting to get current user.');
    const user = getCurrentUser();
    setCurrentUser(user);

    if (user && user.role === 'superadmin') {
      console.log('[SelectOutletPage] User is superadmin, redirecting to /admin/users.');
      router.push('/admin/users');
      return;
    }
    if (!user) {
        console.log('[SelectOutletPage] No user found, redirecting to /login.');
        toast({title: "Session Expired", description: "Please log in again.", variant: "destructive"});
        router.push('/login');
        setIsLoading(false); // Stop loading as we are redirecting
        return;
    }
     if (user.status === 'pending_approval' || user.status === 'inactive') {
        console.log(`[SelectOutletPage] User status is ${user.status}, showing toast and stopping loading.`);
        toast({
            title: `Account ${user.status === 'pending_approval' ? 'Pending Approval' : 'Inactive'}`,
            description: `Your account is currently ${user.status}. Please contact support or wait for approval.`,
            variant: "destructive",
        });
        setIsLoading(false); // Stop loading as they can't proceed
        return;
    }
    // If user is loaded, and not redirected, isLoading will be handled by the outlets fetching useEffect
  }, [router, toast]);

  const fetchOutlets = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId || currentUser.status !== 'active') {
      console.log('[SelectOutletPage] fetchOutlets: Pre-conditions not met (no currentUser, merchantId, or status not active). Bailing.', currentUser);
      setIsLoading(false);
      setAvailableOutlets([]);
      return;
    }

    console.log(`[SelectOutletPage] fetchOutlets: Fetching for merchantId: ${currentUser.merchantId}`);
    setIsLoading(true); // Explicitly set true when fetch starts
    try {
      const q = query(
        collection(db, "outlets"),
        where("merchantId", "==", currentUser.merchantId),
        orderBy("name", "asc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedOutlets: Outlet[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOutlets.push({ id: doc.id, ...doc.data() } as Outlet);
      });
      console.log('[SelectOutletPage] fetchOutlets: Fetched outlets:', fetchedOutlets);
      setAvailableOutlets(fetchedOutlets);
    } catch (error) {
      console.error("Error fetching outlets for selection: ", error);
      toast({ title: "Fetch Failed", description: "Could not load your outlets. Please try again.", variant: "destructive" });
      setAvailableOutlets([]);
    } finally {
        setIsLoading(false); // Ensure isLoading is set to false in all outcomes
    }
  }, [currentUser, toast]); // db, collection, query, where, orderBy, getDocs are stable

  useEffect(() => {
    console.log('[SelectOutletPage] Outlets fetch useEffect triggered. Current user:', currentUser);
    if (currentUser) {
      if (currentUser.merchantId && currentUser.status === 'active') {
        console.log('[SelectOutletPage] User is active admin with merchantId. Calling fetchOutlets.');
        fetchOutlets();
      } else {
        console.log('[SelectOutletPage] User loaded, but not eligible to fetch outlets (missing merchantId or inactive).', { merchantId: currentUser.merchantId, status: currentUser.status });
        setIsLoading(false);
        setAvailableOutlets([]);
        if (currentUser.status && currentUser.status !== 'active') {
          // Toast for pending/inactive is handled by the main useEffect
        } else if (!currentUser.merchantId) {
          toast({
            title: "Account Configuration Issue",
            description: "Your admin account is not properly associated with a merchant. Please contact support.",
            variant: "destructive",
            duration: 7000,
          });
        }
      }
    } else {
      // currentUser is null, initial useEffect might still be running or redirecting.
      // If not redirecting (e.g. user object malformed but not null),
      // this path could lead to isLoading not being set to false.
      // However, the initial useEffect should handle redirect if !user.
      // If this else block is hit without a redirect, it implies a state issue.
      console.log('[SelectOutletPage] CurrentUser is null in outlets fetch useEffect. This might be an intermediate state.');
      // It's safer to set isLoading to false if currentUser is definitively null and not handled by other logic
      // But usually, the first useEffect redirects if user is null.
      // If it persists here, it implies user should have been redirected.
    }
  }, [currentUser, fetchOutlets, toast]);


  const handleSelectOutlet = (outlet: Outlet) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
    }
    router.push('/dashboard');
  };
  
  // This isLoading check is for the main page content
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your outlets...</p>
      </div>
    );
  }

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
             <div className="text-center py-6 text-muted-foreground">
                <p className="mb-2">No outlets available for your account.</p>
                <p className="text-sm">If you are an admin, please ensure your account is correctly configured and outlets have been added for your merchant.</p>
             </div>
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
