
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, PlusCircle, Loader2 } from 'lucide-react';
import type { Outlet as OutletType, User as FirestoreUserType } from '@/types';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUserType } from 'firebase/auth';

interface AppAuthUser {
  uid: string;
  email: string;
  displayName: string;
}


export default function SelectOutletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [availableOutlets, setAvailableOutlets] = useState<OutletType[]>([]);
  
  const [authUser, setAuthUser] = useState<AppAuthUser | null | false>(false);
  const [firestoreUserData, setFirestoreUserData] = useState<FirestoreUserType | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    console.log('[SelectOutletPage E1] Auth listener useEffect triggered.');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser((prevAuthUser) => {
          if (prevAuthUser && typeof prevAuthUser === 'object' && prevAuthUser.uid === user.uid) {
            console.log('[SelectOutletPage E1] onAuthStateChanged: Same user, no authUser state change needed.', { uid: user.uid });
            return prevAuthUser; 
          }
          console.log('[SelectOutletPage E1] onAuthStateChanged: User is logged in, updating authUser state.', { uid: user.uid, email: user.email });
          return { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' };
        });
      } else {
        console.log('[SelectOutletPage E1] onAuthStateChanged: User is logged out, setting authUser to null.');
        setAuthUser(null);
        // No need to redirect here, E4 handles it
      }
    });
    return () => {
      console.log('[SelectOutletPage E1] Auth listener cleanup.');
      unsubscribe();
    };
  }, []);


  const fetchFirestoreUser = useCallback(async (uid: string) => {
    console.log(`[SelectOutletPage E2 FF] Fetching Firestore user for UID: ${uid}`);
    setIsLoadingUser(true);
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as FirestoreUserType;
        console.log('[SelectOutletPage E2 FF] Firestore user data found:', userData);
        setFirestoreUserData(userData);
      } else {
        console.log('[SelectOutletPage E2 FF] No Firestore user document found for UID:', uid);
        toast({ title: "User Data Error", description: "User profile not found in database.", variant: "destructive" });
        setFirestoreUserData(null);
      }
    } catch (error: any) {
      console.error("[SelectOutletPage E2 FF] Error fetching Firestore user data: ", error);
      toast({ title: "Fetch Failed", description: `Could not load user profile: ${error.message}`, variant: "destructive" });
      setFirestoreUserData(null);
    } finally {
      setIsLoadingUser(false);
      console.log('[SelectOutletPage E2 FF] fetchFirestoreUser finally block. Setting isLoadingUser to false.');
    }
  }, [toast]);

  useEffect(() => {
    console.log('[SelectOutletPage E2] Firestore user fetch useEffect triggered. authUser:', authUser);
    if (authUser && authUser.uid) {
      fetchFirestoreUser(authUser.uid);
    } else if (authUser === null) { 
      console.log('[SelectOutletPage E2] AuthUser is null (logged out), clearing Firestore user data and stopping user loading.');
      setFirestoreUserData(null);
      setIsLoadingUser(false); 
    }
  }, [authUser, fetchFirestoreUser]);


  const fetchOutletsForSelection = useCallback(async () => {
    if (!firestoreUserData || !firestoreUserData.merchantId) {
      console.log('[SelectOutletPage E3 FF] Pre-conditions for fetching outlets not met (no firestoreUserData or merchantId). Bailing.', { hasUser: !!firestoreUserData, hasMerchantId: !!firestoreUserData?.merchantId });
      setIsLoadingOutlets(false);
      setAvailableOutlets([]);
      return;
    }
    
    const merchantIdForQuery = firestoreUserData.merchantId;
    console.log(`[SelectOutletPage E3 FF] Starting fetch for outlets. Merchant ID: ${merchantIdForQuery}`);
    setIsLoadingOutlets(true);

    try {
      const q = query(
        collection(db, "outlets"),
        where("merchantId", "==", merchantIdForQuery),
        orderBy("name", "asc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedOutlets: OutletType[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOutlets.push({ id: doc.id, ...doc.data() } as OutletType);
      });
      console.log('[SelectOutletPage E3 FF] Firestore query for outlets completed. Fetched outlets count:', fetchedOutlets.length, 'Outlets:', fetchedOutlets.map(o => o.name));
      setAvailableOutlets(fetchedOutlets);

    } catch (error: any) {
      console.error("[SelectOutletPage E3 FF] Error fetching outlets for selection: ", error);
      let errorMessage = `Could not load your outlets. Error: ${error.message}`;
      if (error.message && error.message.includes("indexes?create_composite")) {
        errorMessage = `The query requires an index. Please create it in Firebase Console. Link: ${error.message.substring(error.message.indexOf('https://'))}`;
      }
      toast({ title: "Fetch Failed", description: errorMessage, variant: "destructive", duration: 10000 });
      setAvailableOutlets([]);
    } finally {
      setIsLoadingOutlets(false);
      console.log('[SelectOutletPage E3 FF] fetchOutletsForSelection finally block. Setting isLoadingOutlets to false.');
    }
  }, [firestoreUserData, toast]); 

 useEffect(() => {
    console.log('[SelectOutletPage E3] Outlets fetch useEffect triggered. firestoreUserData:', firestoreUserData, 'isLoadingUser:', isLoadingUser);

    if (firestoreUserData && firestoreUserData.merchantId && firestoreUserData.status === 'active' && !isLoadingUser) {
      console.log('[SelectOutletPage E3] User is active with merchantId, and user loading is false. Calling fetchOutletsForSelection.');
      fetchOutletsForSelection();
    } else {
      if (!isLoadingUser) { 
         console.log('[SelectOutletPage E3] Conditions for outlet fetch not met, and user loading is false. Setting isLoadingOutlets to false and clearing outlets.');
         setIsLoadingOutlets(false);
         setAvailableOutlets([]); 
      } else {
        console.log('[SelectOutletPage E3] Conditions for outlet fetch not met, BUT user is still loading. Waiting for user loading to complete.');
      }
    }
  }, [firestoreUserData, isLoadingUser, fetchOutletsForSelection]);


  useEffect(() => {
    console.log('[SelectOutletPage E4] User status/role check useEffect triggered. authUser:', authUser, 'firestoreUserData:', firestoreUserData, 'isLoadingUser:', isLoadingUser);
    
    if (isLoadingUser || authUser === false) { 
        console.log('[SelectOutletPage E4] User data or auth state still loading/unknown. No action.');
        return; 
    }

    if (authUser === null && !isLoadingUser) { 
        console.log('[SelectOutletPage E4] User logged out, redirecting to login.');
        router.push('/login');
        return;
    }
    
    if (firestoreUserData) {
        if (firestoreUserData.role === 'superadmin') {
            console.log('[SelectOutletPage E4] User is superadmin, redirecting to /admin/users.');
            router.push('/admin/users');
            return; 
        }
        if (firestoreUserData.status !== 'active') {
            let toastTitle = 'Account Issue';
            let toastDesc = `Your account status is '${firestoreUserData.status || 'unknown'}'. Please contact support.`;
            if (firestoreUserData.status === 'pending_approval') {
                toastTitle = 'Account Pending Approval';
                toastDesc = 'Your account is currently pending approval.';
            } else if (firestoreUserData.status === 'inactive') {
                toastTitle = 'Account Inactive';
                toastDesc = 'Your account is currently inactive.';
            } else if (firestoreUserData.status === 'status_undefined_from_firestore') { // This case was from login form
                toastTitle = 'Account Configuration Error';
                toastDesc = 'Your account status is not properly configured. Please contact support.';
            }
            
            toast({ title: toastTitle, description: toastDesc, variant: "destructive", duration: 7000 });
            console.log(`[SelectOutletPage E4] User status is ${firestoreUserData.status}, showing toast. Will not fetch outlets.`);
            return; 
        }
        if (!firestoreUserData.merchantId) {
            toast({
                title: "Account Configuration Issue",
                description: "Your admin account is not properly associated with a merchant. Please contact support.",
                variant: "destructive",
                duration: 7000,
            });
            console.log('[SelectOutletPage E4] User has no merchantId. Will not fetch outlets.');
             return;
        }

    } else if (authUser && !isLoadingUser && !firestoreUserData) {
        console.log('[SelectOutletPage E4] Auth user exists, but no Firestore user data after loading. Error toast should have been shown in fetchFirestoreUser.');
    }

  }, [authUser, firestoreUserData, isLoadingUser, router, toast]);


  const handleSelectOutlet = (outlet: OutletType) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
    }
    router.push('/dashboard');
  };

  if (authUser === false || (authUser && isLoadingUser && !firestoreUserData) ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{authUser === false ? "Checking authentication..." : "Loading user data..."}</p>
      </div>
    );
  }
  
  if (authUser === null && !isLoadingUser) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        <p className="text-muted-foreground">You are not logged in. Redirecting...</p>
      </div>
    );
  }

  if (isLoadingOutlets && firestoreUserData && firestoreUserData.status === 'active' && firestoreUserData.merchantId) {
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
          {availableOutlets.length > 0 ? availableOutlets.map((outlet) => (
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
          )) : (
             <div className="text-center py-6 text-muted-foreground">
                <p className="mb-2">
                    {(firestoreUserData && firestoreUserData.status === 'active' && firestoreUserData.merchantId) 
                        ? "No outlets found for your merchant account."
                        : "Cannot load outlets. Please check account status or configuration."
                    }
                </p>
                <p className="text-sm">
                    Current Status: {firestoreUserData?.status || 'N/A'}. Merchant ID: {firestoreUserData?.merchantId ? 'Set' : 'Not Set'}.
                    If issues persist, contact support. (Account: {authUser?.email || 'N/A'})
                </p>
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
