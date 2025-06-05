'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, Search, QrCode, CreditCard, ShoppingCart, Loader2, Plus, Minus, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db, serverTimestamp } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, runTransaction, Timestamp, getDoc } from 'firebase/firestore';
import type { Product as FirestoreProduct, Transaction as FirestoreTransaction, TransactionItem, SystemSettings } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from 'date-fns';

// Custom Rupiah Icon Component
const RupiahIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => (
  <svg
    ref={ref}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 3h8a4 4 0 0 1 0 8H6V3z" />
    <path d="M6 11h6a3 3 0 0 1 0 6H6v-6z" />
    <path d="M6 21h12" />
    <path d="M6 18h12" />
  </svg>
));
RupiahIcon.displayName = "RupiahIcon";

// Local interface for user data from localStorage
interface StoredUser {
  id: string; // kasirId
  email: string;
  displayName: string; // kasirName
  role?: string;
  merchantId?: string;
  status?: 'active' | 'pending_approval' | 'inactive';
}

// Local interface for selected outlet data from localStorage
interface SelectedOutlet {
  id: string; // outletId
  name: string; // outletName
}

interface CartItem {
  productId: string;
  productName: string;
  unitName: string;
  pricePerUnit: number;
  quantity: number;
  availableStock: number; // Keep track of stock for the unit in cart
}

interface ReceiptDisplayData extends Omit<FirestoreTransaction, 'id' | 'timestamp'> {
  displayId: string;
  displayTimestamp: Date;
}

const getDisplayUnit = (product: FirestoreProduct): FirestoreProduct['units'][0] | undefined => {
  if (!product.units || product.units.length === 0) return undefined;
  const baseUnit = product.units.find(u => u.isBaseUnit);
  return baseUnit || product.units[0];
};

const formatNumberWithDots = (value: number | string): string => {
  const numStr = String(value).replace(/\D/g, '');
  if (numStr === '') return '';
  return Number(numStr).toLocaleString('id-ID');
};

const parseFormattedNumber = (value: string): number => {
  return Number(String(value).replace(/\./g, ''));
};

const formatCurrencyForReceipt = (amount: number | undefined) => {
  if (amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [formattedCashReceived, setFormattedCashReceived] = useState('');

  const [firestoreProducts, setFirestoreProducts] = useState<FirestoreProduct[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<SelectedOutlet | null>(null);

  const [receiptDetails, setReceiptDetails] = useState<ReceiptDisplayData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('mockUser');
      const outletIdStr = localStorage.getItem('selectedOutletId'); 
      const outletNameStr = localStorage.getItem('selectedOutletName');

      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        toast({ title: "Error", description: "Pengguna tidak dikenal. Harap login kembali.", variant: "destructive" });
      }

      if (outletIdStr && outletNameStr) { 
        setSelectedOutlet({ id: outletIdStr, name: outletNameStr });
      } else {
        toast({ title: "Error", description: "Outlet belum dipilih. Harap pilih outlet.", variant: "destructive" });
      }
    }
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    if (!currentUser?.merchantId) {
      setIsLoadingProducts(false);
      return;
    }
    setIsLoadingProducts(true);
    try {
      const q = query(
        collection(db, "products"),
        where("merchantId", "==", currentUser.merchantId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedProducts: FirestoreProduct[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProducts.push({ id: doc.id, ...doc.data() } as FirestoreProduct);
      });
      setFirestoreProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products for POS: ", error);
      toast({ title: "Gagal Memuat Produk", description: "Tidak dapat memuat produk.", variant: "destructive" });
    }
    setIsLoadingProducts(false);
  }, [currentUser?.merchantId, toast]);

  const fetchSystemSettings = useCallback(async () => {
    if (!currentUser?.merchantId) {
        setIsLoadingSettings(false);
        setSystemSettings({ ppnRate: 0, discountRate: 0 }); 
        return;
    }
    setIsLoadingSettings(true);
    try {
        const settingsRef = doc(db, "settings", currentUser.merchantId);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            setSystemSettings(docSnap.data() as SystemSettings);
        } else {
            setSystemSettings({ ppnRate: 0, discountRate: 0 }); 
            toast({ title: "Info Pengaturan", description: "Pengaturan PPN/Diskon spesifik tidak ditemukan. Menggunakan 0%.", variant: "default" });
        }
    } catch (error) {
        console.error("Error fetching system settings:", error);
        toast({ title: "Gagal Memuat Pengaturan", description: "Tidak dapat memuat pengaturan PPN/Diskon. Menggunakan 0%.", variant: "destructive" });
        setSystemSettings({ ppnRate: 0, discountRate: 0 }); 
    }
    setIsLoadingSettings(false);
  }, [currentUser?.merchantId, toast]);

  useEffect(() => {
    if (currentUser?.merchantId) {
      fetchProducts();
      fetchSystemSettings();
    }
  }, [currentUser, fetchProducts, fetchSystemSettings]);

  const addToCart = (product: FirestoreProduct) => {
    if (cart.length === 0 && receiptDetails) {
      setReceiptDetails(null); 
    }

    const unitToAdd = getDisplayUnit(product);
    if (!unitToAdd) {
      toast({ title: "Error", description: `Produk ${product.name} tidak memiliki unit yang bisa dijual.`, variant: "destructive" });
      return;
    }

    if (unitToAdd.stock <= 0) {
        toast({ title: "Stok Habis", description: `${product.name} (${unitToAdd.name}) saat ini stok habis.`, variant: "destructive" });
        return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.productId === product.id && item.unitName === unitToAdd.name);
      if (existingItem) {
        if (existingItem.quantity < unitToAdd.stock) {
            return prevCart.map(item =>
              item.productId === product.id && item.unitName === unitToAdd.name
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
        } else {
            toast({ title: "Stok Maksimum Tercapai", description: `Tidak bisa menambah ${product.name} (${unitToAdd.name}) lagi. Stok di keranjang sudah maksimal.`, variant: "default" });
            return prevCart;
        }
      }
      return [...prevCart, {
        productId: product.id,
        productName: product.name,
        unitName: unitToAdd.name,
        pricePerUnit: unitToAdd.price,
        quantity: 1,
        availableStock: unitToAdd.stock
      }];
    });
  };

  const removeFromCart = (productId: string, unitName: string) => {
    setCart(cart.filter(item => !(item.productId === productId && item.unitName === unitName)));
  };

  const updateQuantity = (productId: string, unitName: string, change: number) => {
    setCart(prevCart => {
      const itemIndex = prevCart.findIndex(item => item.productId === productId && item.unitName === unitName);
      if (itemIndex === -1) return prevCart;

      const currentItem = prevCart[itemIndex];
      const newQuantity = currentItem.quantity + change;

      if (newQuantity <= 0) {
        return prevCart.filter((_, index) => index !== itemIndex);
      }
      if (newQuantity > currentItem.availableStock) {
        toast({ title: "Melebihi Batas Stok", description: `Tidak bisa mengatur kuantitas ${currentItem.productName} (${unitName}) melebihi stok tersedia (${currentItem.availableStock}).`, variant: "default" });
        return prevCart.map((item, index) =>
          index === itemIndex ? { ...item, quantity: currentItem.availableStock } : item
        );
      }
      return prevCart.map((item, index) =>
        index === itemIndex ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

  const ppnRateValue = systemSettings?.ppnRate ?? 0;
  const discountRateValue = systemSettings?.discountRate ?? 0;

  const ppnRateForCalc = ppnRateValue / 100;
  const discountRateForCalc = discountRateValue / 100;

  const discountAmount = subtotal * discountRateForCalc;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const ppnAmount = subtotalAfterDiscount * ppnRateForCalc;
  const totalAmount = subtotalAfterDiscount + ppnAmount;
  const changeGiven = paymentMethod === 'cash' && cashReceived > totalAmount ? cashReceived - totalAmount : 0;

  const filteredProducts = firestoreProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePayment = async () => {
    if (!currentUser || !currentUser.id || !currentUser.merchantId || !selectedOutlet || !selectedOutlet.id) {
      toast({ title: "Error", description: "Informasi pengguna, merchant, atau outlet tidak lengkap. Tidak bisa melanjutkan.", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Keranjang Kosong", description: "Harap tambahkan item ke keranjang sebelum pembayaran.", variant: "default" });
      return;
    }
    // Removed validation for cash received - payment can proceed even without entering amount

    setIsProcessingPayment(true);

    const transactionItems: TransactionItem[] = cart.map(item => ({
      productId: item.productId,
      productName: item.productName,
      unitName: item.unitName,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.pricePerUnit * item.quantity,
    }));

    const transactionDataForFirestore: Omit<FirestoreTransaction, 'id' | 'timestamp'> & { timestamp: any } = {
      kasirId: currentUser.id,
      kasirName: currentUser.displayName,
      outletId: selectedOutlet.id,
      outletName: selectedOutlet.name,
      merchantId: currentUser.merchantId,
      items: transactionItems,
      subtotal: subtotal,
      discountAmount: discountAmount,
      ppnAmount: ppnAmount,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      timestamp: serverTimestamp(),
    };

    if (paymentMethod === 'cash') {
      transactionDataForFirestore.cashReceived = cashReceived;
      transactionDataForFirestore.changeGiven = changeGiven;
    }

    const newTransactionRef = doc(collection(db, "transactions")); 

    try {
      await runTransaction(db, async (firestoreTransactionRunner) => {
        for (const cartItem of cart) {
          const productRef = doc(db, "products", cartItem.productId);
          const productDoc = await firestoreTransactionRunner.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Produk ${cartItem.productName} tidak ditemukan di database.`);
          }

          const productData = productDoc.data() as FirestoreProduct;
          const unitIndex = productData.units.findIndex(u => u.name === cartItem.unitName);

          if (unitIndex === -1) {
            throw new Error(`Unit ${cartItem.unitName} untuk produk ${cartItem.productName} tidak ditemukan.`);
          }

          if (productData.units[unitIndex].stock < cartItem.quantity) {
            throw new Error(`Stok tidak mencukupi untuk ${productData.name} (${cartItem.unitName}). Tersedia: ${productData.units[unitIndex].stock}, Diminta: ${cartItem.quantity}.`);
          }

          productData.units[unitIndex].stock -= cartItem.quantity;
          firestoreTransactionRunner.update(productRef, {
            units: productData.units,
            updatedAt: serverTimestamp()
          });
        }
        firestoreTransactionRunner.set(newTransactionRef, transactionDataForFirestore);
      });

      toast({ title: "Pembayaran Berhasil!", description: `Total: ${formatCurrencyForReceipt(totalAmount)}. Stok diperbarui.` });
      
      const cleanRestOfData = Object.fromEntries(
        Object.entries(transactionDataForFirestore).filter(([key]) => key !== 'timestamp')
      ) as Omit<FirestoreTransaction, 'id' | 'timestamp'>;

      const receiptDataForDisplay: ReceiptDisplayData = {
        ...cleanRestOfData,
        displayId: newTransactionRef.id,
        displayTimestamp: new Date(), 
      };
      setReceiptDetails(receiptDataForDisplay); 

      setCart([]);
      setCashReceived(0);
      setFormattedCashReceived('');
      fetchProducts(); 

    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast({ title: "Pembayaran Gagal", description: error.message || "Terjadi kesalahan saat pembayaran.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCashReceivedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);
    
    if (!isNaN(numericValue)) {
        setCashReceived(numericValue);
        setFormattedCashReceived(formatNumberWithDots(numericValue));
    } else if (rawValue === '') {
        setCashReceived(0);
        setFormattedCashReceived('');
    }
  };
  
  const handlePrintReceipt = () => {
    if (!receiptDetails || !selectedOutlet) return;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;
    
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nota Transaksi</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 10px;
            width: 280px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 5px 0; }
          .item-row { display: flex; justify-content: space-between; }
          .no-print { display: none; }
          @media print {
            body { width: auto; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="center bold">${selectedOutlet.name}</div>
        <div class="separator"></div>
        <div>Kasir    : ${receiptDetails.kasirName}</div>
        <div>Tanggal  : ${format(receiptDetails.displayTimestamp, "dd/MM/yyyy HH:mm:ss")}</div>
        <div>No. Struk: ${receiptDetails.displayId.substring(0,10)}...</div>
        <div class="separator"></div>
        ${receiptDetails.items.map(item => `
          <div>${item.productName} (${item.unitName})</div>
          <div class="item-row">
            <span>${item.quantity} x ${formatCurrencyForReceipt(item.pricePerUnit)}</span>
            <span>${formatCurrencyForReceipt(item.totalPrice)}</span>
          </div>
        `).join('')}
        <div class="separator"></div>
        <div class="item-row">
          <span>Subtotal</span>
          <span>${formatCurrencyForReceipt(receiptDetails.subtotal)}</span>
        </div>
        <div class="item-row">
          <span>Diskon (${discountRateValue.toFixed(0)}%)</span>
          <span>-${formatCurrencyForReceipt(receiptDetails.discountAmount)}</span>
        </div>
        <div class="separator"></div>
        <div class="item-row bold">
          <span>TOTAL</span>
          <span>${formatCurrencyForReceipt(receiptDetails.totalAmount)}</span>
        </div>
        <div class="separator"></div>
        <div>Metode Bayar: ${receiptDetails.paymentMethod.toUpperCase()}</div>
        ${receiptDetails.paymentMethod === 'cash' ? `
          <div class="item-row">
            <span>Tunai</span>
            <span>${formatCurrencyForReceipt(receiptDetails.cashReceived)}</span>
          </div>
          <div class="item-row">
            <span>Kembali</span>
            <span>${formatCurrencyForReceipt(receiptDetails.changeGiven)}</span>
          </div>
        ` : ''}
        <div class="separator"></div>
        <div class="center">
          <div>Terima Kasih!</div>
          <div>Kunjungi Lagi Toko Kami.</div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.28))] max-h-[calc(100vh-theme(spacing.28))] flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Product Selection Area */}
      <Card className="lg:w-3/5 shadow-lg flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Katalog Produk</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari produk..."
              className="w-full rounded-lg bg-background pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4 pt-0">
            {isLoadingProducts || isLoadingSettings ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg">
                    {isLoadingProducts && isLoadingSettings ? "Memuat produk & pengaturan..." : isLoadingProducts ? "Memuat produk..." : "Memuat pengaturan..."}
                </p>
              </div>
            ) : filteredProducts.length === 0 && firestoreProducts.length > 0 ? (
                 <p className="col-span-full text-center text-muted-foreground py-10">Tidak ada produk yang cocok dengan pencarian Anda.</p>
            ) : firestoreProducts.length === 0 ? (
                 <p className="col-span-full text-center text-muted-foreground py-10">Tidak ada produk yang tersedia untuk merchant ini.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const displayUnit = getDisplayUnit(product);
                  const stock = displayUnit ? displayUnit.stock : 0;
                  const price = displayUnit ? displayUnit.price : 0;

                  return (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-auto flex flex-col items-center justify-center p-4 gap-1.5 text-center shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => addToCart(product)}
                      disabled={!displayUnit || stock <= 0 || isProcessingPayment}
                    >
                      <span className="text-sm font-semibold line-clamp-2">{product.name}</span>
                      {displayUnit && (
                        <span className="text-xs text-primary font-medium">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price)}
                          <span className="text-muted-foreground text-[10px]"> / {displayUnit.name}</span>
                        </span>
                      )}
                      {(!displayUnit || stock <= 0) && <Badge variant="destructive" className="text-xs mt-1">Stok Habis</Badge>}
                    </Button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Cart & Payment Area */}
      <Card className="lg:w-2/5 shadow-lg flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Pesanan Saat Ini</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4 pt-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">Keranjang Anda kosong</p>
                <p className="text-sm">Tambahkan produk dari katalog untuk memulai.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.unitName}`} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.productName} <span className="text-xs text-muted-foreground">({item.unitName})</span></p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrencyForReceipt(item.pricePerUnit)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, item.unitName, -1)}
                        disabled={isProcessingPayment}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, item.unitName, 1)}
                        disabled={isProcessingPayment || item.quantity >= item.availableStock}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.productId, item.unitName)} disabled={isProcessingPayment}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        {(cart.length > 0 || receiptDetails) && ( 
          <div className="border-t p-4 space-y-3">
            {cart.length > 0 && ( 
            <>
                <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrencyForReceipt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                <span>Diskon ({(discountRateValue).toFixed(0)}%)</span>
                <span>- {formatCurrencyForReceipt(discountAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                {/* <span>PPN ({(ppnRateValue).toFixed(0)}%)</span>
                <span>{formatCurrencyForReceipt(ppnAmount)}</span> */}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold font-headline">
                <span>Total</span>
                <span>{formatCurrencyForReceipt(totalAmount)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('cash')} disabled={isProcessingPayment}>
                    <RupiahIcon className="h-4 w-4" /> Tunai
                </Button>
                <Button variant={paymentMethod === 'qris' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('qris')} disabled={isProcessingPayment}>
                    <QrCode className="h-4 w-4" /> QRIS
                </Button>
                </div>
                {paymentMethod === 'cash' && (
                <div className="pt-2">
                    <Input
                    type="text"
                    placeholder="Uang Diterima (Opsional)"
                    value={formattedCashReceived}
                    onChange={handleCashReceivedChange}
                    className="text-right"
                    disabled={isProcessingPayment}
                    />
                    {cashReceived > 0 && totalAmount > 0 && cashReceived >= totalAmount && (
                    <p className="text-sm text-muted-foreground mt-1 text-right">
                        Kembalian: {formatCurrencyForReceipt(changeGiven)}
                    </p>
                    )}
                </div>
                )}
                <Button
                    size="lg"
                    className="w-full font-headline mt-2"
                    onClick={handlePayment}
                    disabled={isLoadingSettings || totalAmount <=0 || isProcessingPayment || !currentUser || !selectedOutlet}
                >
                {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                {isProcessingPayment ? "Memproses..." : "Lanjutkan ke Pembayaran"}
                </Button>
            </>
            )}
            {receiptDetails && cart.length === 0 && ( 
                <Button 
                    onClick={() => setIsReceiptModalOpen(true)} 
                    variant="outline" 
                    className="w-full font-headline mt-2"
                    disabled={isProcessingPayment}
                >
                    <Printer className="mr-2 h-5 w-5" /> Lihat Nota Terakhir
                </Button>
            )}
          </div>
        )}
      </Card>

      {isReceiptModalOpen && receiptDetails && (
        <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline text-lg flex items-center">
                <Printer className="h-5 w-5 mr-2 text-primary" /> Nota Transaksi
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1">
              <pre className="text-xs font-mono whitespace-pre-wrap p-3 bg-muted rounded-md leading-relaxed">
{`
${selectedOutlet?.name || 'Outlet T/A'}
------------------------------------
Kasir    : ${receiptDetails.kasirName || 'N/A'}
Tanggal  : ${format(receiptDetails.displayTimestamp, "dd/MM/yyyy HH:mm:ss")}
No. Struk: ${receiptDetails.displayId.substring(0,10)}...
------------------------------------
${receiptDetails.items.map(item => 
`  ${item.productName} (${item.unitName})
  ${item.quantity} x ${formatCurrencyForReceipt(item.pricePerUnit).padEnd(12)} ${formatCurrencyForReceipt(item.totalPrice).padStart(10)}`
).join('\n')}
------------------------------------
Subtotal        : ${formatCurrencyForReceipt(receiptDetails.subtotal).padStart(15)}
Diskon (${discountRateValue.toFixed(0)}%) : ${formatCurrencyForReceipt(receiptDetails.discountAmount).padStart(15)}
------------------------------------
TOTAL           : ${formatCurrencyForReceipt(receiptDetails.totalAmount).padStart(15)}
------------------------------------
Metode Bayar : ${receiptDetails.paymentMethod.toUpperCase()}
${receiptDetails.paymentMethod === 'cash' ?
`Tunai           : ${formatCurrencyForReceipt(receiptDetails.cashReceived).padStart(15)}
Kembali         : ${formatCurrencyForReceipt(receiptDetails.changeGiven).padStart(15)}` : ''}
------------------------------------

        Terima Kasih!
      Kunjungi Lagi Toko Kami.
`}
              </pre>
            </ScrollArea>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)}>Tutup</Button>
              <Button onClick={handlePrintReceipt}>
                 <Printer className="mr-2 h-4 w-4" /> Cetak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}