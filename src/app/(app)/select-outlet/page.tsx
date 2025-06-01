
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    if (user && user.role === 'superadmin') {
      router.push('/admin/users');
      return;
    }
    if (!user) {
        // This case should ideally be caught by AppLayout, but as a fallback
        toast({title: "Session Expired", description: "Please log in again.", variant: "destructive"});
        router.push('/login');
        return;
    }
     if (user.status === 'pending_approval' || user.status === 'inactive') {
        toast({
            title: `Account ${user.status === 'pending_approval' ? 'Pending Approval' : 'Inactive'}`,
            description: `Your account is currently ${user.status}. Please contact support or wait for approval.`,
            variant: "destructive",
        });
        // Consider logging out or redirecting to a specific info page
        // For now, we'll prevent further action by not loading outlets
        setIsLoading(false);
        return;
    }


  }, [router, toast]);

  const fetchOutlets = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId || currentUser.status !== 'active') {
      setIsLoading(false);
      setAvailableOutlets([]);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "outlets"), 
        where("merchantId", "==", currentUser.merchantId),
        orderBy("name", "asc") // Order by name for consistent display
      );
      const querySnapshot = await getDocs(q);
      const fetchedOutlets: Outlet[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOutlets.push({ id: doc.id, ...doc.data() } as Outlet);
      });
      setAvailableOutlets(fetchedOutlets);
    } catch (error) {
      console.error("Error fetching outlets for selection: ", error);
      toast({ title: "Fetch Failed", description: "Could not load your outlets. Please try again.", variant: "destructive" });
      setAvailableOutlets([]);
    }
    setIsLoading(false);
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser && currentUser.merchantId && currentUser.status === 'active') {
      fetchOutlets();
    }
  }, [currentUser, fetchOutlets]);


  const handleSelectOutlet = (outlet: Outlet) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', outlet.id);
      localStorage.setItem('selectedOutletName', outlet.name);
    }
    router.push('/dashboard');
  };
  
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
                <p className="mb-2">No outlets available for selection.</p>
                <p className="text-sm">You can add your first outlet from the management page.</p>
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
