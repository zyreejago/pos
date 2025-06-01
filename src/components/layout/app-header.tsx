
"use client";

import Link from 'next/link';
import {
  Bell,
  Building,
  CircleUser,
  Menu,
  LogOut,
  Settings as SettingsIcon,
  Store, 
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetTrigger } from "@/components/ui/sheet"; 
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { useToast } from '@/hooks/use-toast';
import type { Outlet } from '@/types'; 
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

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
        console.error("Failed to parse user from localStorage in AppHeader", e);
        return null;
      }
    }
  }
  return null;
};

const OUTLETS_CACHE_KEY = 'outletsCacheKey'; // Key for localStorage communication

export function AppHeader() {
  const { isMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [outletsCacheKeyState, setOutletsCacheKeyState] = useState<string | null>(null); // To react to localStorage changes
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // Effect for initializing from localStorage and setting up storage listener
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    if (typeof window !== 'undefined') {
      setSelectedOutletId(localStorage.getItem('selectedOutletId'));
      setOutletsCacheKeyState(localStorage.getItem(OUTLETS_CACHE_KEY));
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === OUTLETS_CACHE_KEY && event.storageArea === localStorage) {
        console.log('[AppHeader] Storage event for OUTLETS_CACHE_KEY detected. New value:', event.newValue);
        setOutletsCacheKeyState(event.newValue);
      }
      if (event.key === 'selectedOutletId' && event.storageArea === localStorage) {
        console.log('[AppHeader] Storage event for selectedOutletId detected. New value:', event.newValue);
        setSelectedOutletId(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Run once on mount to initialize and set up listener

  const fetchOutletsForDropdown = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId || currentUser.role === 'superadmin' || currentUser.status !== 'active') {
      setAvailableOutlets([]);
      setIsLoadingOutlets(false);
      return;
    }
    setIsLoadingOutlets(true);
    console.log(`[AppHeader] Fetching outlets for dropdown. Merchant ID: ${currentUser.merchantId}`);
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
      setAvailableOutlets(fetchedOutlets);
      console.log('[AppHeader] Fetched outlets for dropdown:', fetchedOutlets.map(o => o.name));

      // Validate selectedOutletId
      const currentSelectedOutletId = localStorage.getItem('selectedOutletId'); // Read fresh from localStorage
      if (currentSelectedOutletId && !fetchedOutlets.some(o => o.id === currentSelectedOutletId)) {
        console.log(`[AppHeader] Selected outlet ${currentSelectedOutletId} no longer valid or found. Clearing selection.`);
        localStorage.removeItem('selectedOutletId');
        localStorage.removeItem('selectedOutletName');
        setSelectedOutletId(null); // Update state to trigger re-render and clear dropdown selection
      } else if (!currentSelectedOutletId && fetchedOutlets.length > 0 && pathname !== '/select-outlet') {
        // If no outlet is selected but outlets are available, and not on selection page,
        // it might imply user needs to select one, or we could auto-select first.
        // For now, AppLayout handles redirection to /select-outlet if needed.
      }


    } catch (error) {
      console.error("Error fetching outlets for header: ", error);
      toast({ title: "Error", description: "Could not load outlets for selection.", variant: "destructive" });
    }
    setIsLoadingOutlets(false);
  }, [currentUser, toast]); // Removed selectedOutletId from here, effect below handles it

  // Effect for fetching outlets when relevant state changes
  useEffect(() => {
    if (currentUser) {
      console.log('[AppHeader] Effect to fetch outlets triggered. User:', currentUser?.email, 'SelectedOutletId:', selectedOutletId, 'CacheKey:', outletsCacheKeyState, 'Pathname:', pathname);
      fetchOutletsForDropdown();
    } else {
      setAvailableOutlets([]); // Clear outlets if no user
    }
  }, [currentUser, selectedOutletId, outletsCacheKeyState, fetchOutletsForDropdown, pathname]); // Added pathname to re-fetch on navigation if needed


  const handleLogout = async () => {
    try {
      await signOut(auth); 
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mockUser');
        localStorage.removeItem('selectedOutletId');
        localStorage.removeItem('selectedOutletName');
        localStorage.removeItem(OUTLETS_CACHE_KEY); // Clear cache key on logout
      }
      setCurrentUser(null);
      setSelectedOutletId(null);
      setAvailableOutlets([]);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
        console.error("Error signing out: ", error);
        toast({
            title: "Logout Failed",
            description: "An error occurred while logging out. Please try again.",
            variant: "destructive",
        });
    }
  };
  
  const handleOutletChange = (newOutletId: string) => {
    const selectedOutletDetails = availableOutlets.find(o => o.id === newOutletId);
    if (selectedOutletDetails && typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', selectedOutletDetails.id);
      localStorage.setItem('selectedOutletName', selectedOutletDetails.name);
      setSelectedOutletId(selectedOutletDetails.id); // Directly update state

      toast({
        title: "Outlet Changed",
        description: `Switched to ${selectedOutletDetails.name}. Refreshing page...`,
      });
      // Force a reload or navigate to ensure all components depending on selected outlet update correctly.
      // Navigating to dashboard is a common pattern.
      // Using window.location.href to ensure a full refresh which re-initializes states from localStorage.
      window.location.href = '/dashboard'; 
    }
  };

  const showOutletSelector = currentUser && currentUser.role !== 'superadmin' && pathname !== '/select-outlet' && currentUser.status === 'active';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shadow-sm">
      {isMobile ? (
         <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
      ) : (
        <SidebarTrigger className="hidden md:flex" />
      )}
      
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {showOutletSelector && (
          <div className="ml-auto flex-1 sm:flex-initial">
             {isLoadingOutlets ? (
                <div className="flex items-center justify-center h-10 w-full md:w-[200px] lg:w-[280px] bg-background rounded-md border px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> 
                    <span className="ml-2 text-sm text-muted-foreground">Loading outlets...</span>
                </div>
            ) : (
            <Select 
              value={selectedOutletId || ""} 
              onValueChange={handleOutletChange}
              disabled={availableOutlets.length === 0}
            >
              <SelectTrigger className="w-full md:w-[200px] lg:w-[280px] bg-background shadow-inner">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" /> 
                  <SelectValue placeholder="Select Outlet" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableOutlets.length > 0 ? availableOutlets.map((outlet) => ( 
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                )) : (
                  <SelectItem value="no-outlets" disabled>No outlets available</SelectItem>
                )}
              </SelectContent>
            </Select>
            )}
          </div>
        )}
      
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full ml-auto">
              <CircleUser className="h-6 w-6" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {currentUser ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none font-headline">
                      {currentUser.displayName || currentUser.email?.split('@')[0] || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser.role !== 'superadmin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/select-outlet" className="flex items-center gap-2 cursor-pointer">
                      <Building className="h-4 w-4" />
                      <span>Change Outlet</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                   <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-600 hover:!text-red-600 focus:text-red-600 dark:text-red-500 dark:hover:!text-red-500 dark:focus:text-red-500">
                  <LogOut className="h-4 w-4"/>
                  <span>Log out</span>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/login" className="flex items-center gap-2 cursor-pointer">
                     <LogOut className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/register" className="flex items-center gap-2 cursor-pointer">
                     <CircleUser className="h-4 w-4" />
                    <span>Register</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
