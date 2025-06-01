
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building,
  ShoppingBag,
  Truck,
  Users,
  FileText,
  Settings,
  DollarSign,
  Store,
  ClipboardList, // Changed icon for Inventory
  UserCog,
  ShieldCheck,
  LifeBuoy,
  Archive, // New icon for Inventory
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';


const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/outlets', label: 'Outlet Management', icon: Store },
  { href: '/products', label: 'Products', icon: ShoppingBag },
  { href: '/inventory', label: 'Manajemen Stok', icon: Archive }, // Added Inventory
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/pos', label: 'Kasir (POS)', icon: DollarSign }, 
  { href: '/kasir', label: 'Manage Kasir', icon: Users }, 
  { href: '/reports', label: 'Reports', icon: FileText },
];

const settingsMenuItems = [
 { href: '/settings', label: 'System Settings', icon: Settings },
];

const superAdminMenuItems = [
  { href: '/admin/users', label: 'User Management', icon: UserCog },
  // { href: '/admin/merchants', label: 'Merchant Approvals', icon: ShieldCheck }, // Example for more superadmin items
];


export function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpen, isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Determine if current path is superadmin for conditional menu
  const isSuperAdminPath = pathname.startsWith('/admin');

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="border-b">
        <Link href="/dashboard" className="flex items-center gap-2 py-2" onClick={handleLinkClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary lucide lucide-shopping-cart"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.16"/></svg>
          <span className={cn(
            "font-headline text-xl font-semibold text-primary transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0 group-hover/sidebar-wrapper:opacity-100",
            "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0"
            )}>
            Toko App
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {(isSuperAdminPath ? superAdminMenuItems : menuItems).map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/')}
                tooltip={item.label}
              >
                <Link href={item.href} onClick={handleLinkClick}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {!isSuperAdminPath && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Configuration</SidebarGroupLabel>
                <SidebarMenu>
                    {settingsMenuItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(item.href)}
                            tooltip={item.label}
                        >
                            <Link href={item.href} onClick={handleLinkClick}>
                            <item.icon />
                            <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarSeparator className="my-0" />
      <SidebarFooter className="border-t-0 p-2"> 
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Help & Support" asChild>
                    <Link href="/support" onClick={handleLinkClick}><LifeBuoy /><span>Support</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
