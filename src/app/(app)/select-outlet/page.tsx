
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, PlusCircle, Loader2 } from 'lucide-react';
import type { Outlet as OutletType, User as FirestoreUserType } from '@/types'; // Renamed Outlet to OutletType
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUserType } from 'firebase/auth';

// Extended AuthUser to include what we set
interface AppAuthUser {
  uid: string;
  email: string; // Ensure email is always string
  displayName: string; // Ensure displayName is always string
}


export default function SelectOutletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [availableOutlets, setAvailableOutlets] = useState<OutletType[]>([]);
  
  const [authUser, setAuthUser] = useState<AppAuthUser | null | false>(false); // false: initial, null: logged out, AppAuthUser: logged in
  const [firestoreUserData, setFirestoreUserData] = useState<FirestoreUserType | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Start true as auth check is pending
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false); // Start false, only true when fetching outlets

  const [isClient, setIsClient] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect for Auth State
  useEffect(() => {
    console.log('[SelectOutletPage E1] Auth listener useEffect triggered.');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser((prevAuthUser) => {
          // Only update if UID changed or if it was initially (false) or null
          if (prevAuthUser && typeof prevAuthUser === 'object' && prevAuthUser.uid === user.uid) {
            console.log('[SelectOutletPage E1] onAuthStateChanged: Same user, no authUser state change needed.', { uid: user.uid });
            return prevAuthUser; // Important: return previous state object to prevent re-render if identical
          }
          console.log('[SelectOutletPage E1] onAuthStateChanged: User is logged in, updating authUser state.', { uid: user.uid, email: user.email });
          return { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' };
        });
      } else {
        console.log('[SelectOutletPage E1] onAuthStateChanged: User is logged out, setting authUser to null.');
        setAuthUser(null);
      }
    });
    return () => {
      console.log('[SelectOutletPage E1] Auth listener cleanup.');
      unsubscribe();
    };
  }, []); // Empty dependency array, so it runs once on mount


  const fetchFirestoreUser = useCallback(async (uid: string) => {
    console.log(`[SelectOutletPage E2 FF] Fetching Firestore user for UID: ${uid}`);
    setIsLoadingUser(true);
    setDebugInfo((prev: any) => ({ ...prev, fetchFirestoreUserCalled: true, uidForFirestoreFetch: uid, isLoadingUserSetTrue: true }));
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as FirestoreUserType;
        console.log('[SelectOutletPage E2 FF] Firestore user data found:', userData);
        setFirestoreUserData(userData);
        setDebugInfo((prev: any) => ({ ...prev, firestoreUserFetched: { email: userData.email, role: userData.role, status: userData.status, merchantId: userData.merchantId } }));
      } else {
        console.log('[SelectOutletPage E2 FF] No Firestore user document found for UID:', uid);
        toast({ title: "User Data Error", description: "User profile not found in database.", variant: "destructive" });
        setFirestoreUserData(null);
        setDebugInfo((prev: any) => ({ ...prev, firestoreUserFetched: null, firestoreUserNotFound: true }));
      }
    } catch (error: any) {
      console.error("[SelectOutletPage E2 FF] Error fetching Firestore user data: ", error);
      toast({ title: "Fetch Failed", description: `Could not load user profile: ${error.message}`, variant: "destructive" });
      setFirestoreUserData(null);
      setDebugInfo((prev: any) => ({ ...prev, firestoreUserFetchError: error.message, firestoreUserFetched: null }));
    } finally {
      setIsLoadingUser(false);
      console.log('[SelectOutletPage E2 FF] fetchFirestoreUser finally block. Setting isLoadingUser to false.');
      setDebugInfo((prev: any) => ({ ...prev, isLoadingUserFinal: false, isLoadingUserSetFalse: true }));
    }
  }, [toast]);

  // Effect for fetching Firestore User Data (depends on authUser)
  useEffect(() => {
    console.log('[SelectOutletPage E2] Firestore user fetch useEffect triggered. authUser:', authUser);
    setDebugInfo((prev: any) => ({ ...prev, useEffect2Triggered: true, authUserInEffect2: authUser ? { uid: authUser.uid, email: authUser.email } : authUser }));
    if (authUser && authUser.uid) {
      fetchFirestoreUser(authUser.uid);
    } else if (authUser === null) { // Explicitly logged out
      console.log('[SelectOutletPage E2] AuthUser is null (logged out), clearing Firestore user data and stopping user loading.');
      setFirestoreUserData(null);
      setIsLoadingUser(false); 
      setDebugInfo((prev: any) => ({ ...prev, firestoreUserClearedDueToLogout: true, isLoadingUserFinal: false }));
    }
    // If authUser is false (initial state), do nothing, wait for auth state
  }, [authUser, fetchFirestoreUser]);


  const fetchOutletsForSelection = useCallback(async () => {
    if (!firestoreUserData || !firestoreUserData.merchantId) {
      console.log('[SelectOutletPage E3 FF] Pre-conditions for fetching outlets not met (no firestoreUserData or merchantId). Bailing.', { hasUser: !!firestoreUserData, hasMerchantId: !!firestoreUserData?.merchantId });
      setIsLoadingOutlets(false);
      setAvailableOutlets([]);
      setDebugInfo((prev: any) => ({ ...prev, fetchOutletsBail: true, isLoadingOutletsFinalFromPreconditionFail: false, availableOutletsFinalCount: 0, reasonForBail: `No Firestore User or MerchantId. User: ${!!firestoreUserData}, MerchID: ${!!firestoreUserData?.merchantId}` }));
      return;
    }
    
    const merchantIdForQuery = firestoreUserData.merchantId;
    console.log(`[SelectOutletPage E3 FF] Starting fetch for outlets. Merchant ID: ${merchantIdForQuery}`);
    setIsLoadingOutlets(true);
    setDebugInfo((prev: any) => ({ ...prev, fetchStarted: true, merchantIdForQuery, isLoadingOutletsSetTrue: true }));

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
      setDebugInfo((prev: any) => ({ ...prev, fetchedOutletsCount: fetchedOutlets.length, fetchedOutletNames: fetchedOutlets.map(o=>o.name) }));

    } catch (error: any) {
      console.error("[SelectOutletPage E3 FF] Error fetching outlets for selection: ", error);
      toast({ title: "Fetch Failed", description: `Could not load your outlets. Error: ${error.message}`, variant: "destructive" });
      setAvailableOutlets([]);
      setDebugInfo((prev: any) => ({ ...prev, fetchError: error.message, fetchedOutletsCount: 0 }));
    } finally {
      setIsLoadingOutlets(false);
      console.log('[SelectOutletPage E3 FF] fetchOutletsForSelection finally block. Setting isLoadingOutlets to false.');
      setDebugInfo((prev: any) => ({ ...prev, isLoadingOutletsFinal: false, isLoadingOutletsSetFalse: true }));
    }
  }, [firestoreUserData, toast]); // Removed db from deps as it's stable

  // Effect for fetching Outlets (depends on firestoreUserData and isLoadingUser)
 useEffect(() => {
    console.log('[SelectOutletPage E3] Outlets fetch useEffect triggered. firestoreUserData:', firestoreUserData, 'isLoadingUser:', isLoadingUser);
    setDebugInfo((prev: any) => ({ ...prev, useEffect3Triggered: true, firestoreUserInEffect3: firestoreUserData ? {email: firestoreUserData.email, role: firestoreUserData.role, status: firestoreUserData.status} : null, isLoadingUserInEffect3: isLoadingUser }));

    if (firestoreUserData && firestoreUserData.merchantId && firestoreUserData.status === 'active' && !isLoadingUser) {
      console.log('[SelectOutletPage E3] User is active with merchantId, and user loading is false. Calling fetchOutletsForSelection.');
      setDebugInfo((prev: any) => ({ ...prev, callingFetchOutlets: true, currentUserNullInEffect2: false }));
      fetchOutletsForSelection();
    } else {
      // This block will run if conditions aren't met OR if firestoreUserData is null (e.g. after logout or if user doc not found)
      // OR if isLoadingUser is true
      setDebugInfo((prev: any) => ({
        ...prev,
        callingFetchOutlets: false,
        fetchOutletsBailE3: true, // Renamed key for clarity
        reasonForBailE3: `FirestoreUserData: ${!!firestoreUserData}, MerchantId: ${!!firestoreUserData?.merchantId}, StatusActive: ${firestoreUserData?.status === 'active'}, IsLoadingUser: ${isLoadingUser}`,
        currentUserNullInEffect2: !firestoreUserData, 
      }));
      if (!isLoadingUser) { // Only proceed if user loading is definitively finished
         console.log('[SelectOutletPage E3] Conditions for outlet fetch not met, and user loading is false. Setting isLoadingOutlets to false and clearing outlets.');
         setIsLoadingOutlets(false);
         setAvailableOutlets([]); 
         setDebugInfo((prev: any) => ({ ...prev, isLoadingOutletsFinalFromE3Bail: false, availableOutletsFinalCount: 0 }));
      } else {
        console.log('[SelectOutletPage E3] Conditions for outlet fetch not met, BUT user is still loading. Waiting for user loading to complete.');
      }
    }
  }, [firestoreUserData, isLoadingUser, fetchOutletsForSelection]);


  // Effect for redirects and toasts based on user type and status (depends on firestoreUserData and isLoadingUser)
  useEffect(() => {
    console.log('[SelectOutletPage E4] User status/role check useEffect triggered. authUser:', authUser, 'firestoreUserData:', firestoreUserData, 'isLoadingUser:', isLoadingUser);
    
    if (isLoadingUser || authUser === false) { // Still loading user data or auth state unknown
        console.log('[SelectOutletPage E4] User data or auth state still loading/unknown. No action.');
        return; 
    }

    if (authUser === null && !isLoadingUser) { // Definitely logged out and user loading finished
        console.log('[SelectOutletPage E4] User logged out, redirecting to login.');
        router.push('/login');
        return;
    }
    
    if (firestoreUserData) {
        setDebugInfo((prev:any) => ({ ...prev, useEffect4Check: true, userForRSRedirectCheck: { email: firestoreUserData.email, role: firestoreUserData.role, status: firestoreUserData.status } }));
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
            } else if (firestoreUserData.status === 'status_undefined_from_firestore') {
                toastTitle = 'Account Configuration Error';
                toastDesc = 'Your account status is not properly configured. Please contact support.';
            }
            
            toast({ title: toastTitle, description: toastDesc, variant: "destructive", duration: 7000 });
            console.log(`[SelectOutletPage E4] User status is ${firestoreUserData.status}, showing toast. Will not fetch outlets.`);
            // No router.push here, let them see the toast on this page.
            // Outlets won't be fetched due to the condition in the other useEffect.
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
        // Auth user exists, user loading is done, but no Firestore user data (e.g., doc not found)
        // Toast for this case is handled in fetchFirestoreUser
        console.log('[SelectOutletPage E4] Auth user exists, but no Firestore user data after loading. Error toast should have been shown.');
    }

  }, [authUser, firestoreUserData, isLoadingUser, router, toast]);


  const handleSelectOutlet = (outlet: OutletType) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
    }
    router.push('/dashboard');
  };

  const getDebugInfoForRender = () => {
    // This function now runs on both server and client.
    // isClient helps differentiate client-side specific values after mount.
    const baseDebug = {
      isLoading: isLoadingUser || isLoadingOutlets,
      isLoadingUserState: isLoadingUser,
      isLoadingOutletsState: isLoadingOutlets,
      authUserDebug: authUser === false ? "checking_auth" : (authUser ? { uid: authUser.uid, email: authUser.email } : "null_auth"),
      firestoreUserDebug: firestoreUserData ? { email: firestoreUserData.email, role: firestoreUserData.role, status: firestoreUserData.status, merchantId: firestoreUserData.merchantId } : "null_firestore_user",
      availableOutletsCount: availableOutlets.length,
      debugStateAccumulated: debugInfo, // Show the accumulated debug state
      outletNamesForRender: availableOutlets.map(o=>o.name)
    };
    if (isClient) {
      return baseDebug; // On client after mount, everything is as is
    }
    // For server render or initial client render before isClient=true
    return {
      ...baseDebug,
      // Potentially mask or set placeholders for values that strictly come from client-side effects if needed
      // For now, this setup should be fine as long as initial authUser/firestoreUserData are null/false
    };
  };


  // ---- RENDER LOGIC ----

  if (authUser === false || (authUser && isLoadingUser && !firestoreUserData) ) { // Auth state not determined OR authUser exists but firestore user data is still loading for the first time
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        {isClient && <div className="fixed top-0 left-0 bg-yellow-200/80 p-2 text-xs text-black z-50 max-w-full overflow-auto backdrop-blur-sm">
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(getDebugInfoForRender(), null, 2)}</pre>
        </div>}
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{authUser === false ? "Checking authentication..." : "Loading user data..."}</p>
      </div>
    );
  }
  
  // If user is explicitly logged out (authUser is null) and not loading user data anymore (e.g. after failed auth)
  // This case should ideally be handled by redirection in E4 or AppLayout, but as a fallback:
  if (authUser === null && !isLoadingUser) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
         {isClient && <div className="fixed top-0 left-0 bg-yellow-200/80 p-2 text-xs text-black z-50 max-w-full overflow-auto backdrop-blur-sm">
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(getDebugInfoForRender(), null, 2)}</pre>
        </div>}
        <p className="text-muted-foreground">You are not logged in. Redirecting...</p>
      </div>
    );
  }

  // At this point, authUser should exist (or have led to redirect), and isLoadingUser should be false.
  // firestoreUserData might be null if doc not found, or populated.
  // The E4 useEffect handles toasts/redirects for problematic firestoreUserData (role, status, no merchantId).

  if (isLoadingOutlets && firestoreUserData && firestoreUserData.status === 'active' && firestoreUserData.merchantId) {
    // Only show outlet loader if we are eligible and actually attempting to load outlets
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        {isClient && <div className="fixed top-0 left-0 bg-yellow-200/80 p-2 text-xs text-black z-50 max-w-full overflow-auto backdrop-blur-sm">
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(getDebugInfoForRender(), null, 2)}</pre>
        </div>}
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your outlets...</p>
      </div>
    );
  }

  // Final display: either outlets list or "no outlets / issue" message
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
      {isClient && <div className="fixed top-0 left-0 bg-yellow-200/80 p-2 text-xs text-black z-50 max-w-full overflow-auto backdrop-blur-sm">
         <pre className="whitespace-pre-wrap break-all">{JSON.stringify(getDebugInfoForRender(), null, 2)}</pre>
      </div>}

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
                    If issues persist, contact support.
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

