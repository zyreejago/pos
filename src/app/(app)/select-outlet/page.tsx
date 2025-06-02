
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser((prevAuthUser) => {
          if (prevAuthUser && typeof prevAuthUser === 'object' && prevAuthUser.uid === user.uid) {
            return prevAuthUser; 
          }
          return { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' };
        });
      } else {
        setAuthUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchFirestoreUser = useCallback(async (uid: string) => {
    setIsLoadingUser(true);
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setFirestoreUserData(userDocSnap.data() as FirestoreUserType);
      } else {
        toast({ title: "User Data Error", description: "User profile not found in database.", variant: "destructive" });
        setFirestoreUserData(null);
      }
    } catch (error: any) {
      toast({ title: "Fetch Failed", description: `Could not load user profile: ${error.message}`, variant: "destructive" });
      setFirestoreUserData(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authUser && authUser.uid) {
      fetchFirestoreUser(authUser.uid);
    } else if (authUser === null) { 
      setFirestoreUserData(null);
      setIsLoadingUser(false); 
    }
  }, [authUser, fetchFirestoreUser]);

  const fetchOutletsForSelection = useCallback(async () => {
    if (!firestoreUserData || !firestoreUserData.merchantId || firestoreUserData.status !== 'active') {
      setIsLoadingOutlets(false);
      setAvailableOutlets([]);
      return;
    }
    
    const merchantIdForQuery = firestoreUserData.merchantId;
    setIsLoadingOutlets(true);

    try {
      const q = query(
        collection(db, "outlets"),
        where("merchantId", "==", merchantIdForQuery),
        orderBy("name", "asc")
      );
      const querySnapshot = await getDocs(q);
      let fetchedOutlets: OutletType[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOutlets.push({ id: doc.id, ...doc.data() } as OutletType);
      });

      if (firestoreUserData.role === 'kasir') {
        if (firestoreUserData.outlets && firestoreUserData.outlets.length > 0) {
          fetchedOutlets = fetchedOutlets.filter(outlet => 
            (firestoreUserData.outlets as string[]).includes(outlet.id)
          );
        } else {
          // Kasir has no outlets assigned in their user document
          fetchedOutlets = []; 
        }
      }
      setAvailableOutlets(fetchedOutlets);

    } catch (error: any) {
      let errorMessage = `Could not load your outlets. Error: ${error.message}`;
      if (error.message && error.message.includes("indexes?create_composite")) {
        errorMessage = `The query requires an index. Please create it in Firebase Console. Link: ${error.message.substring(error.message.indexOf('https://'))}`;
      }
      toast({ title: "Fetch Failed", description: errorMessage, variant: "destructive", duration: 10000 });
      setAvailableOutlets([]);
    } finally {
      setIsLoadingOutlets(false);
    }
  }, [firestoreUserData, toast]); 

 useEffect(() => {
    if (firestoreUserData && firestoreUserData.merchantId && firestoreUserData.status === 'active' && !isLoadingUser) {
      fetchOutletsForSelection();
    } else {
      if (!isLoadingUser) { 
         setIsLoadingOutlets(false); 
         setAvailableOutlets([]); 
      }
    }
  }, [firestoreUserData, isLoadingUser, fetchOutletsForSelection]);

  useEffect(() => {
    if (isLoadingUser || authUser === false) { 
        return; 
    }
    if (authUser === null && !isLoadingUser) { 
        router.push('/login');
        return;
    }
    if (firestoreUserData) {
        if (firestoreUserData.role === 'superadmin') {
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
            return; 
        }
        if (!firestoreUserData.merchantId) {
            toast({
                title: "Account Configuration Issue",
                description: "Your account is not properly associated with a merchant. Please contact support.",
                variant: "destructive",
                duration: 7000,
            });
             return;
        }
    }
  }, [authUser, firestoreUserData, isLoadingUser, router, toast]);

  const handleSelectOutlet = (outlet: OutletType) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
      window.location.href = '/dashboard';
    } else {
      router.push('/dashboard');
    }
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

  if (firestoreUserData && firestoreUserData.status === 'active' && firestoreUserData.merchantId && isLoadingOutlets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your outlets...</p>
      </div>
    );
  }

  const canManageOutlets = firestoreUserData && firestoreUserData.role === 'admin';

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.28))] p-4 md:p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <Store className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-headline">Select Your Outlet</CardTitle>
          <CardDescription>
            {firestoreUserData?.role === 'kasir' 
              ? "Choose from your assigned outlets to operate from."
              : "Choose the outlet you want to manage or operate from."
            }
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
                {isLoadingOutlets ? (
                    <p className="mb-2">Loading outlets...</p>
                ) : (firestoreUserData && firestoreUserData.status === 'active' && firestoreUserData.merchantId) ? (
                    firestoreUserData.role === 'kasir' && (!firestoreUserData.outlets || firestoreUserData.outlets.length === 0) ? (
                        <div className="flex flex-col items-center gap-2">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                            <p className="font-semibold">No Outlets Assigned</p>
                            <p>You have not been assigned to any outlets yet. Please contact your merchant admin.</p>
                        </div>
                    ) : (
                        <p className="mb-2">No outlets found for your account.</p>
                    )
                ) : (
                    <p className="mb-2">
                        Cannot load outlets. (Status: {firestoreUserData?.status || 'N/A'}, Merchant ID: {firestoreUserData?.merchantId ? 'Set' : 'Not Set'})
                    </p>
                )}
                {(firestoreUserData?.status !== 'active' || !firestoreUserData?.merchantId) && !isLoadingUser && (
                    <p className="text-sm">
                        Please ensure your account is active and correctly configured.
                        If issues persist, contact support. (Account: {authUser?.email || 'N/A'})
                    </p>
                )}
             </div>
          )}
          {canManageOutlets && (
            <Button variant="ghost" asChild className="w-full mt-6 text-primary hover:text-primary/90 hover:bg-primary/10">
                <Link href="/outlets">
                <PlusCircle className="mr-2 h-4 w-4" />
                Manage / Add Outlets
                </Link>
            </Button>
          )}
        </CardContent>
      </Card>
       <p className="mt-8 text-center text-sm text-muted-foreground">
        Need to switch outlets later? You can do so from the header menu.
      </p>
    </div>
  );
}

    