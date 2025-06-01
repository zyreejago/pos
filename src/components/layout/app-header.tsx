
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
  Store, // Added Store icon
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
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"; // Ensure SheetContent and SheetTrigger are imported
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
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { useToast } from '@/hooks/use-toast';
import type { Outlet } from '@/types'; // Import Outlet type

// Mock user type
interface MockUser {
  email: string;
  displayName: string;
  role?: string;
}

// Consistent mock outlets
const mockAppOutlets: Outlet[] = [
  { id: "outlet_1", name: "Main Outlet", address: "Jl. Sudirman No. 123, Jakarta Pusat", merchantId: "merch_1" },
  { id: "outlet_2", name: "Branch Kemang", address: "Jl. Kemang Raya No. 45, Jakarta Selatan", merchantId: "merch_1" },
  { id: "outlet_3", name: "Warehouse Cilandak", address: "Jl. TB Simatupang Kav. 6, Jakarta Selatan", merchantId: "merch_1" },
  { id: "outlet_4", name: "Toko App Bandung", address: "Jl. Asia Afrika No. 1, Bandung", merchantId: "merch_2" },
];


export function AppHeader() {
  const { isMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    // Check for mock user in localStorage
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
      // Get selected outlet
      const storedOutletId = localStorage.getItem('selectedOutletId');
      setSelectedOutletId(storedOutletId);
    }
  }, [router, pathname]); // Re-check on route change

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mockUser');
      localStorage.removeItem('selectedOutletId');
      localStorage.removeItem('selectedOutletName');
    }
    setCurrentUser(null);
    setSelectedOutletId(null);
    toast({
      title: "Logged Out (Mock)",
      description: "You have been successfully logged out.",
    });
    router.push('/login');
  };
  
  const handleOutletChange = (outletId: string) => {
    const selectedOutlet = mockAppOutlets.find(o => o.id === outletId);
    if (selectedOutlet && typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', selectedOutlet.id);
      localStorage.setItem('selectedOutletName', selectedOutlet.name);
      setSelectedOutletId(selectedOutlet.id);
      toast({
        title: "Outlet Changed",
        description: `Switched to ${selectedOutlet.name}.`,
      });
      router.push('/dashboard'); // Navigate to dashboard to apply new outlet context
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
        {showOutletSelector && selectedOutletId && (
          <div className="ml-auto flex-1 sm:flex-initial">
            <Select value={selectedOutletId} onValueChange={handleOutletChange}>
              <SelectTrigger className="w-full md:w-[200px] lg:w-[280px] bg-background shadow-inner">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" /> {/* Changed icon to Store */}
                  <SelectValue placeholder="Select Outlet" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {mockAppOutlets.map((outlet) => ( // Using mockAppOutlets
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* If no outlet selected and should be shown, perhaps a message or disabled selector */}
        {showOutletSelector && !selectedOutletId && (
           <div className="ml-auto flex-1 sm:flex-initial text-sm text-muted-foreground">
             Please select an outlet.
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
                {/* <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                    <CircleUser className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem asChild>
                   <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {/* <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                  <LifeBuoy className="h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem> */}
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
