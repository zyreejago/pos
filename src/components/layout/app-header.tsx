
"use client";

import Link from 'next/link';
import {
  Bell,
  Building,
  CircleUser,
  Home,
  Menu,
  Package2,
  Search,
  ShoppingCart,
  Users,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  LifeBuoy,
  Store, 
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
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"; 
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { useToast } from '@/hooks/use-toast';
import type { Outlet } from '@/types'; 

interface MockUser {
  email: string;
  displayName: string;
  role?: string;
}

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
      console.error("Failed to parse outlets from localStorage in header", e);
      localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(defaultSeedOutlets)); // Reseed if corrupt
      return defaultSeedOutlets;
    }
  } else {
    // Seed localStorage if it's empty
    localStorage.setItem(APP_OUTLETS_STORAGE_KEY, JSON.stringify(defaultSeedOutlets));
    return defaultSeedOutlets;
  }
};


export function AppHeader() {
  const { isMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('mockUser');
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse mock user from localStorage", e);
          localStorage.removeItem('mockUser'); 
        }
      }
      
      const outletsFromStorage = getStoredOutlets();
      setAvailableOutlets(outletsFromStorage);

      const storedOutletId = localStorage.getItem('selectedOutletId');
      // Ensure selectedOutletId is valid against available outlets
      if (storedOutletId && outletsFromStorage.some(o => o.id === storedOutletId)) {
        setSelectedOutletId(storedOutletId);
      } else if (outletsFromStorage.length > 0 && !pathname.startsWith('/select-outlet') && (!storedUser || JSON.parse(storedUser).role !== 'superadmin')) {
        // If no valid outlet selected, and there are outlets, and not superadmin, and not on select-outlet page
        // this scenario should ideally be caught by AppLayout, but as a fallback, clear potentially invalid selection
        localStorage.removeItem('selectedOutletId');
        localStorage.removeItem('selectedOutletName');
        setSelectedOutletId(null);
      } else {
        setSelectedOutletId(storedOutletId); // can be null if not set
      }
    }
  }, [pathname]); // Re-check on route change, especially selectedOutletId from localStorage

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mockUser');
      localStorage.removeItem('selectedOutletId');
      localStorage.removeItem('selectedOutletName');
      localStorage.removeItem(APP_OUTLETS_STORAGE_KEY); // Optional: Clear outlets on logout, or keep them for next login
    }
    setCurrentUser(null);
    setSelectedOutletId(null);
    setAvailableOutlets(defaultSeedOutlets); // Reset to default
    toast({
      title: "Logged Out (Mock)",
      description: "You have been successfully logged out.",
    });
    router.push('/login');
  };
  
  const handleOutletChange = (newOutletId: string) => {
    const selectedOutletDetails = availableOutlets.find(o => o.id === newOutletId);
    if (selectedOutletDetails && typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', selectedOutletDetails.id);
      localStorage.setItem('selectedOutletName', selectedOutletDetails.name);
      setSelectedOutletId(selectedOutletDetails.id);
      toast({
        title: "Outlet Changed",
        description: `Switched to ${selectedOutletDetails.name}.`,
      });
      // Force a reload or navigate to dashboard to ensure all components re-evaluate based on new outlet
      // router.push('/dashboard'); 
      // A full page refresh might be more robust for a full context switch in a mock setup
       window.location.pathname = '/dashboard'; // Or specific page that needs outlet context
    }
  };

  const showOutletSelector = currentUser && currentUser.role !== 'superadmin' && pathname !== '/select-outlet';

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
            <Select 
              value={selectedOutletId || ""} // Ensure value is not null for Select
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
          </div>
        )}
      
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
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

    