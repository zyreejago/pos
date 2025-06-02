'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, Search, DollarSign, QrCode, CreditCard, ShoppingCart, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db, serverTimestamp } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, runTransaction, Timestamp, getDoc } from 'firebase/firestore';
import type { Product as FirestoreProduct, Transaction as FirestoreTransaction, TransactionItem, SystemSettings } from '@/types';

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

const getDisplayUnit = (product: FirestoreProduct): FirestoreProduct['units'][0] | undefined => {
  if (!product.units || product.units.length === 0) return undefined;
  const baseUnit = product.units.find(u => u.isBaseUnit);
  return baseUnit || product.units[0];
};

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState(0);

  const [firestoreProducts, setFirestoreProducts] = useState<FirestoreProduct[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<SelectedOutlet | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('mockUser');
      const outletStr = localStorage.getItem('selectedOutletId');
      const outletNameStr = localStorage.getItem('selectedOutletName');

      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        toast({ title: "Error", description: "User not identified. Please re-login.", variant: "destructive" });
      }

      if (outletStr && outletNameStr) {
        setSelectedOutlet({ id: outletStr, name: outletNameStr });
      } else {
        toast({ title: "Error", description: "Outlet not selected. Please select an outlet.", variant: "destructive" });
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
      toast({ title: "Product Fetch Failed", description: "Could not load products.", variant: "destructive" });
    }
    setIsLoadingProducts(false);
  }, [currentUser?.merchantId, toast]);

  const fetchSystemSettings = useCallback(async () => {
    if (!currentUser?.merchantId) {
        setIsLoadingSettings(false);
        setSystemSettings({ ppnRate: 0, discountRate: 0 }); // Default if no merchant
        return;
    }
    setIsLoadingSettings(true);
    try {
        const settingsRef = doc(db, "settings", currentUser.merchantId);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            setSystemSettings(docSnap.data() as SystemSettings);
        } else {
            setSystemSettings({ ppnRate: 0, discountRate: 0 }); // Default if no settings found
            toast({ title: "Settings Info", description: "No specific PPN/Discount settings found for this merchant. Using 0%.", variant: "default" });
        }
    } catch (error) {
        console.error("Error fetching system settings:", error);
        toast({ title: "Settings Fetch Failed", description: "Could not load PPN/Discount settings. Using 0%.", variant: "destructive" });
        setSystemSettings({ ppnRate: 0, discountRate: 0 }); // Default on error
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
    const unitToAdd = getDisplayUnit(product);
    if (!unitToAdd) {
      toast({ title: "Error", description: `Product ${product.name} has no sellable units.`, variant: "destructive" });
      return;
    }

    if (unitToAdd.stock <= 0) {
        toast({ title: "Out of Stock", description: `${product.name} (${unitToAdd.name}) is currently out of stock.`, variant: "destructive" });
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
            toast({ title: "Max Stock Reached", description: `Cannot add more ${product.name} (${unitToAdd.name}). Max stock in cart.`, variant: "default" });
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

  const updateQuantity = (productId: string, unitName: string, quantity: number) => {
    const cartItem = cart.find(item => item.productId === productId && item.unitName === unitName);
    if (!cartItem) return;

    if (quantity <= 0) {
      removeFromCart(productId, unitName);
    } else if (quantity > cartItem.availableStock) {
        toast({ title: "Stock Limit Exceeded", description: `Cannot set quantity for ${cartItem.productName} (${unitName}) beyond available stock (${cartItem.availableStock}).`, variant: "default" });
        setCart(cart.map(item => 
            item.productId === productId && item.unitName === unitName 
            ? { ...item, quantity: cartItem.availableStock } 
            : item
        ));
    } else {
      setCart(cart.map(item => 
        item.productId === productId && item.unitName === unitName 
        ? { ...item, quantity } 
        : item
      ));
    }
  };
  
  const subtotal = cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  
  // Use fetched system settings or default to 0 if still loading or null
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
      toast({ title: "Error", description: "User, merchant, or outlet information is missing. Cannot proceed.", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Empty Cart", description: "Please add items to the cart before payment.", variant: "default" });
      return;
    }
     if (paymentMethod === 'cash' && cashReceived < totalAmount) {
      toast({ title: "Insufficient Cash", description: "Cash received is less than the total amount.", variant: "default" });
      return;
    }

    setIsProcessingPayment(true);

    const transactionData: Omit<FirestoreTransaction, 'id' | 'timestamp'> & { timestamp?: any } = {
      kasirId: currentUser.id,
      kasirName: currentUser.displayName,
      outletId: selectedOutlet.id,
      outletName: selectedOutlet.name,
      merchantId: currentUser.merchantId,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        unitName: item.unitName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.pricePerUnit * item.quantity,
      })),
      subtotal: subtotal,
      discountAmount: discountAmount,
      ppnAmount: ppnAmount,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      timestamp: serverTimestamp(), 
    };

    if (paymentMethod === 'cash') {
      transactionData.cashReceived = cashReceived;
      transactionData.changeGiven = changeGiven;
    }

    try {
      await runTransaction(db, async (firestoreTransaction) => {
        // 1. Update stock for each product unit
        for (const cartItem of cart) {
          const productRef = doc(db, "products", cartItem.productId);
          const productDoc = await firestoreTransaction.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product ${cartItem.productName} not found in database.`);
          }

          const productData = productDoc.data() as FirestoreProduct;
          const unitIndex = productData.units.findIndex(u => u.name === cartItem.unitName);

          if (unitIndex === -1) {
            throw new Error(`Unit ${cartItem.unitName} for product ${cartItem.productName} not found.`);
          }

          if (productData.units[unitIndex].stock < cartItem.quantity) {
            throw new Error(`Insufficient stock for ${productData.name} (${cartItem.unitName}). Available: ${productData.units[unitIndex].stock}, Requested: ${cartItem.quantity}.`);
          }

          productData.units[unitIndex].stock -= cartItem.quantity;
          firestoreTransaction.update(productRef, { 
            units: productData.units,
            updatedAt: serverTimestamp() 
          });
        }

        // 2. Save the transaction
        const transactionCollectionRef = collection(db, "transactions");
        firestoreTransaction.set(doc(transactionCollectionRef), transactionData);
      });

      toast({ title: "Payment Successful!", description: `Total: Rp ${totalAmount.toFixed(0)}. Stocks updated.` });
      setCart([]);
      setCashReceived(0);
      fetchProducts(); 
    
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast({ title: "Payment Failed", description: error.message || "An error occurred during payment.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };


  return (
    <div className="flex h-[calc(100vh-theme(spacing.28))] max-h-[calc(100vh-theme(spacing.28))] flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Product Selection Area */}
      <Card className="lg:w-3/5 shadow-lg flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Product Catalog</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
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
                    {isLoadingProducts && isLoadingSettings ? "Loading products & settings..." : isLoadingProducts ? "Loading products..." : "Loading settings..."}
                </p>
              </div>
            ) : filteredProducts.length === 0 && firestoreProducts.length > 0 ? (
                 <p className="col-span-full text-center text-muted-foreground py-10">No products match your search.</p>
            ) : firestoreProducts.length === 0 ? (
                 <p className="col-span-full text-center text-muted-foreground py-10">No products available for this merchant.</p>
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
                      {(!displayUnit || stock <= 0) && <Badge variant="destructive" className="text-xs mt-1">Out of Stock</Badge>}
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
          <CardTitle className="font-headline text-xl">Current Order</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4 pt-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm">Add products from the catalog to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.unitName}`} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.productName} <span className="text-xs text-muted-foreground">({item.unitName})</span></p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.pricePerUnit)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, item.unitName, parseInt(e.target.value))}
                      className="w-16 h-8 text-center"
                      min="0"
                      disabled={isProcessingPayment}
                    />
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.productId, item.unitName)} disabled={isProcessingPayment}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Discount ({(discountRateValue).toFixed(0)}%)</span>
              <span>- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(discountAmount)}</span>
            </div>
             <div className="flex justify-between text-sm">
              <span>PPN ({(ppnRateValue).toFixed(0)}%)</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(ppnAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold font-headline">
              <span>Total</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount)}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('cash')} disabled={isProcessingPayment}>
                <DollarSign className="h-4 w-4" /> Cash
              </Button>
              <Button variant={paymentMethod === 'qris' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('qris')} disabled={isProcessingPayment}>
                <QrCode className="h-4 w-4" /> QRIS
              </Button>
            </div>
            {paymentMethod === 'cash' && (
              <div className="pt-2">
                <Input 
                  type="number" 
                  placeholder="Cash Received" 
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="text-right"
                  disabled={isProcessingPayment}
                />
                {cashReceived > 0 && totalAmount > 0 && cashReceived >= totalAmount && (
                   <p className="text-sm text-muted-foreground mt-1 text-right">
                     Change: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(changeGiven)}
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
              {isProcessingPayment ? "Processing..." : "Proceed to Payment"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
