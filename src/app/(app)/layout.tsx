"use client"; 

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Sheet, SheetContent } from "@/components/ui/sheet"; 
import { useSidebar } from '@/components/ui/sidebar'; 

function MobileSheetProvider({ children }: { children: React.ReactNode }) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="p-0 w-[calc(var(--sidebar-width-icon)_+_14rem)] bg-sidebar text-sidebar-foreground border-r-0">
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
