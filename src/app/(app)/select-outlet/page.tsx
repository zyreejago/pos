
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
        console.error("[SelectOutletPage E1] Failed to parse user from localStorage", e);
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  // Debug state to display on UI
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    console.log('[SelectOutletPage E1] Initializing, attempting to get current user.');
    const userFromStorage = getCurrentUser();
    setCurrentUser(userFromStorage);
    setDebugInfo((prev:any) => ({ ...prev, currentUserInitial: userFromStorage ? { email: userFromStorage.email, role: userFromStorage.role, status: userFromStorage.status, merchantId: userFromStorage.merchantId } : 'null' }));


    if (userFromStorage && userFromStorage.role === 'superadmin') {
      console.log('[SelectOutletPage E1] User is superadmin, redirecting to /admin/users.');
      router.push('/admin/users');
      return;
    }
    if (!userFromStorage) {
        console.log('[SelectOutletPage E1] No user found, redirecting to /login.');
        toast({title: "Session Expired", description: "Please log in again.", variant: "destructive"});
        router.push('/login');
        setIsLoading(false);
        setDebugInfo((prev:any) => ({ ...prev, isLoadingFinal: false, userRedirect: 'login' }));
        return;
    }
     if (userFromStorage.status === 'pending_approval' || userFromStorage.status === 'inactive') {
        console.log(`[SelectOutletPage E1] User status is ${userFromStorage.status}, showing toast and stopping loading.`);
        toast({
            title: `Account ${userFromStorage.status === 'pending_approval' ? 'Pending Approval' : 'Inactive'}`,
            description: `Your account is currently ${userFromStorage.status}. Please contact support or wait for approval.`,
            variant: "destructive",
        });
        setIsLoading(false);
        setDebugInfo((prev:any) => ({ ...prev, isLoadingFinal: false, userStatusProblem: userFromStorage.status }));
        return;
    }
  }, [router, toast]);

  const fetchOutlets = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId || currentUser.status !== 'active') {
      console.log('[SelectOutletPage FF] Pre-conditions not met for fetch. Bailing.', { hasUser: !!currentUser, hasMerchantId: !!currentUser?.merchantId, isActive: currentUser?.status === 'active' });
      setIsLoading(false);
      setAvailableOutlets([]);
      setDebugInfo((prev:any) => ({ ...prev, fetchOutletsBail: true, isLoadingFinal: false, availableOutletsFinalCount: 0 }));
      return;
    }

    const merchantIdForQuery = currentUser.merchantId;
    console.log(`[SelectOutletPage FF] Starting fetch for merchantId: ${merchantIdForQuery}`);
    setDebugInfo((prev:any) => ({ ...prev, fetchStarted: true, merchantIdForQuery }));
    setIsLoading(true);
    setDebugInfo((prev:any) => ({ ...prev, isLoadingDuringFetch: true }));

    try {
      const q = query(
        collection(db, "outlets"),
        where("merchantId", "==", merchantIdForQuery),
        orderBy("name", "asc")
      );
      console.log(`[SelectOutletPage FF] Firestore query using merchantId: "${merchantIdForQuery}"`);
      const querySnapshot = await getDocs(q);
      const fetchedOutlets: Outlet[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOutlets.push({ id: doc.id, ...doc.data() } as Outlet);
      });
      console.log('[SelectOutletPage FF] Firestore query completed. Fetched outlets count:', fetchedOutlets.length, 'Outlets:', fetchedOutlets.map(o => o.name));
      setAvailableOutlets(fetchedOutlets);
      setDebugInfo((prev:any) => ({ ...prev, fetchedOutletsCount: fetchedOutlets.length, fetchedOutletNames: fetchedOutlets.map(o=>o.name) }));
    } catch (error: any) {
      console.error("[SelectOutletPage FF] Error fetching outlets for selection: ", error);
      toast({ title: "Fetch Failed", description: `Could not load your outlets. Error: ${error.message}`, variant: "destructive" });
      setAvailableOutlets([]);
      setDebugInfo((prev:any) => ({ ...prev, fetchError: error.message, fetchedOutletsCount: 0 }));
    } finally {
        console.log('[SelectOutletPage FF] fetchOutlets finally block. Setting isLoading to false.');
        setIsLoading(false);
        setDebugInfo((prev:any) => ({ ...prev, isLoadingFinal: false })); 
    }
  }, [currentUser, toast]); // db, collection, query, where, orderBy, getDocs are stable

  useEffect(() => {
    console.log('[SelectOutletPage E2] Outlets fetch useEffect triggered. Current user:', currentUser ? currentUser.email : 'null');
    // Corrected line: use currentUser instead of user
    setDebugInfo((prev:any) => ({ ...prev, useEffect2Triggered: true, currentUserInEffect2: currentUser ? { email: currentUser.email, role: currentUser.role, status: currentUser.status, merchantId: currentUser.merchantId } : 'null'  }));
    if (currentUser) {
      if (currentUser.merchantId && currentUser.status === 'active') {
        console.log('[SelectOutletPage E2] User is active admin with merchantId. Calling fetchOutlets.');
        setDebugInfo((prev:any) => ({ ...prev, callingFetchOutlets: true }));
        fetchOutlets();
      } else {
        console.log('[SelectOutletPage E2] User loaded, but not eligible to fetch outlets.', { merchantId: currentUser.merchantId, status: currentUser.status });
        setIsLoading(false);
        setAvailableOutlets([]);
        setDebugInfo((prev:any) => ({ ...prev, isLoadingFinal: false, notEligibleForFetch: true, availableOutletsFinalCount: 0 }));
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
      console.log('[SelectOutletPage E2] CurrentUser is null in outlets fetch useEffect. isLoading remains true or handled by E1.');
       setDebugInfo((prev:any) => ({ ...prev, currentUserNullInEffect2: true }));
       if(isLoading) { 
            setIsLoading(false);
            setDebugInfo((prev:any) => ({ ...prev, isLoadingFinalFromE2NullUser: false }));
       }
    }
  }, [currentUser, fetchOutlets, toast]);


  const handleSelectOutlet = (outlet: Outlet) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
    }
    router.push('/dashboard');
  };
  
  if (isLoading) { 
    console.log('[SelectOutletPage Render] isLoading is true, rendering Loader2.');
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        <div className="fixed top-0 left-0 bg-yellow-200/80 p-2 text-xs text-black z-50 max-w-full overflow-auto backdrop-blur-sm">
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify({isLoading, currentUserDebug: currentUser ? {email:currentUser.email, role:currentUser.role, status:currentUser.status, merchantId:currentUser.merchantId} : 'null', availableOutletsCount: availableOutlets.length, debugState: debugInfo, outletNamesForRender: availableOutlets.map(o=>o.name) }, null, 2)}</pre>
        </div>
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your outlets...</p>
      </div>
    );
  }
  console.log('[SelectOutletPage Render] isLoading is false. Available outlets count:', availableOutlets.length);


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
      <div className="fixed top-0 left-0 bg-yellow-200/80 p-2 text-xs text-black z-50 max-w-full overflow-auto backdrop-blur-sm">
         <pre className="whitespace-pre-wrap break-all">{JSON.stringify({isLoading, currentUserDebug: currentUser ? {email:currentUser.email, role:currentUser.role, status:currentUser.status, merchantId:currentUser.merchantId} : 'null', availableOutletsCount: availableOutlets.length, debugState: debugInfo, outletNamesForRender: availableOutlets.map(o=>o.name) }, null, 2)}</pre>
      </div>

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

