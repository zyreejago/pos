
"use client"; 

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"; 
import { useSidebar } from '@/components/ui/sidebar'; 
import React, { useEffect } from 'react'; // Added React and useEffect
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname

function MobileSheetProvider({ children }: { children: React.ReactNode }) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="p-0 w-[calc(var(--sidebar-width-icon)_+_14rem)] bg-sidebar text-sidebar-foreground border-r-0">
        <SheetTitle className="sr-only">Main Navigation</SheetTitle>
        <AppSidebar />
      </SheetContent>
      {children}
    </Sheet>
  );
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mockUserStr = localStorage.getItem('mockUser');
      let userRole = null;
      if (mockUserStr) {
        try {
          const mockUser = JSON.parse(mockUserStr);
          userRole = mockUser.role;
        } catch (e) {
          console.error("Error parsing mockUser in AppLayout:", e);
          // Potentially clear corrupted user data and redirect to login
          localStorage.removeItem('mockUser');
          localStorage.removeItem('selectedOutletId');
          localStorage.removeItem('selectedOutletName');
          router.push('/login');
          return;
        }
      } else {
        // No user found, redirect to login if not already on an auth page (handled by middleware or page-specific logic)
        // For this layout, if no user, they shouldn't be here unless it's a public part of (app)
        // but we redirect to login if they are not on an auth page
        if (!pathname.startsWith('/auth')) { // Assuming auth pages are outside this layout
             // router.push('/login'); // This might be too aggressive for (app) layout
        }
      }

      const selectedOutletId = localStorage.getItem('selectedOutletId');
      
      // If user is logged in but not superadmin, and not in admin section
      if (userRole && userRole !== 'superadmin' && !pathname.startsWith('/admin')) {
        // And if no outlet is selected, and they are not on the select-outlet page
        if (!selectedOutletId && pathname !== '/select-outlet') {
          router.push('/select-outlet');
        }
      }
    }
  }, [pathname, router]);

  return (
    <SidebarProvider defaultOpen={true}>
      <MobileSheetProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <SidebarInset>
              <main className="flex-1 p-4 pt-6 md:p-6 lg:p-8 bg-background">
                {children}
              </main>
            </SidebarInset>
          </div>
        </div>
      </MobileSheetProvider>
    </SidebarProvider>
  );
}
