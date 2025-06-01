
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
import { db, auth } from '@/lib/firebase'; // Import auth
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Import signOut

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

export function AppHeader() {
  const { isMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    if (typeof window !== 'undefined') {
      const storedOutletId = localStorage.getItem('selectedOutletId');
      setSelectedOutletId(storedOutletId);
    }
  }, [pathname]); 

  const fetchOutletsForDropdown = useCallback(async () => {
    if (!currentUser || !currentUser.merchantId || currentUser.role === 'superadmin' || currentUser.status !== 'active') {
      setAvailableOutlets([]);
      setIsLoadingOutlets(false);
      return;
    }
    setIsLoadingOutlets(true);
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

      // Validate selectedOutletId
      if (selectedOutletId && !fetchedOutlets.some(o => o.id === selectedOutletId)) {
        localStorage.removeItem('selectedOutletId');
        localStorage.removeItem('selectedOutletName');
        setSelectedOutletId(null);
        // Don't redirect here, AppLayout should handle it or user is on select-outlet
      }

    } catch (error) {
      console.error("Error fetching outlets for header: ", error);
      // toast({ title: "Error", description: "Could not load outlets for selection.", variant: "destructive" });
    }
    setIsLoadingOutlets(false);
  }, [currentUser, selectedOutletId]);

  useEffect(() => {
    if (currentUser) { // Fetch outlets if user data is available
      fetchOutletsForDropdown();
    }
  }, [currentUser, fetchOutletsForDropdown]);


  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out from Firebase Auth
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mockUser');
        localStorage.removeItem('selectedOutletId');
        localStorage.removeItem('selectedOutletName');
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
      setSelectedOutletId(selectedOutletDetails.id);
      toast({
        title: "Outlet Changed",
        description: `Switched to ${selectedOutletDetails.name}. Refreshing...`,
      });
       window.location.pathname = '/dashboard'; 
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
              disabled={availableOutlets.length === 0 || isLoadingOutlets}
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
                  <SelectItem value="no-outlets" disabled>No outlets available for this merchant</SelectItem>
                )}
              </SelectContent>
            </Select>
            )}
          </div>
        )}
      
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full ml-auto"> {/* Added ml-auto if outlet selector is not shown */}
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
