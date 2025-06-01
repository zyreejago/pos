
export type UserRole = 'superadmin' | 'admin' | 'kasir';

export interface User {
  id: string; // Corresponds to Firebase Auth UID or mock ID
  name: string; // displayName
  email: string;
  role: UserRole;
  outlets?: string[]; // Outlet IDs kasir has access to
  status: 'active' | 'pending_approval' | 'inactive';
  merchantId?: string; // For kasir/admin, to associate with a merchant
  createdAt?: any; // Firebase ServerTimestamp or Date
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  merchantId: string;
  createdAt?: any; // Firebase ServerTimestamp or Date
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  supplierId?: string;
  buyOwn?: boolean; // "Beli Sendiri" checkbox
  units: Array<{
    name: string; // e.g., "pcs", "dus"
    price: number;
    stock: number;
    isBaseUnit?: boolean; // e.g., "pcs" is base, "dus" contains X pcs
    conversionFactor?: number; // How many base units in this unit
  }>;
  merchantId: string;
  createdAt?: any; // Firebase ServerTimestamp or Date
  updatedAt?: any; // Firebase ServerTimestamp or Date
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  merchantId: string;
  createdAt?: any; // Firebase ServerTimestamp or Date
}

export interface TransactionItem {
  productId: string;
  productName: string;
  unitName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface Transaction {
  id: string;
  kasirId: string;
  kasirName?: string; // Denormalized
  outletId: string;
  outletName?: string; // Denormalized
  items: TransactionItem[];
  subtotal: number;
  discountAmount: number; // Calculated from discountRate
  ppnAmount: number; // Calculated from ppnRate
  totalAmount: number;
  paymentMethod: 'cash' | 'qris';
  cashReceived?: number;
  changeGiven?: number;
  timestamp: any; // Firebase ServerTimestamp or Date
  merchantId: string;
}

export interface SystemSettings {
  ppnRate: number; // Percentage, e.g., 11 for 11%
  discountRate: number; // Percentage, e.g., 5 for 5%
}
