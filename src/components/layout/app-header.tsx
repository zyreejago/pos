
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
// Firebase imports removed
// import { auth } from '@/lib/firebase';
// import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Mock user type
interface MockUser {
  email: string;
  displayName: string;
  role?: string;
}

export function AppHeader() {
  const { isMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const router = useRouter();
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
          localStorage.removeItem('mockUser'); // Clear invalid data
        }
      }
    }
  }, [router]); // Re-check on route change for SPA-like updates

  const handleLogout = async () => {
    // Simulate logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mockUser');
    }
    setCurrentUser(null);
    toast({
      title: "Logged Out (Mock)",
      description: "You have been successfully logged out.",
    });
    router.push('/login');
  };

  // Placeholder data for outlet selection - this should be dynamic later
  const outlets = [
    { id: "1", name: "Main Outlet" },
    { id: "2", name: "Branch A" },
    { id: "3", name: "Warehouse" },
  ];
  const currentOutlet = outlets[0];


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
        <div className="ml-auto flex-1 sm:flex-initial">
           <Select defaultValue={currentOutlet.id}>
            <SelectTrigger className="w-full md:w-[200px] lg:w-[280px] bg-background shadow-inner">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select Outlet" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                    <CircleUser className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                  <LifeBuoy className="h-4 w-4" />
                  <span>Support</span>
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
