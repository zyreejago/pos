import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Search, DollarSign, QrCode, CreditCard } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Kasir (POS) - Toko App',
  description: 'Point of Sale interface for processing transactions.',
};

// Mock product data
const mockProducts = [
  { id: 'prod_1', name: 'Kopi Susu Gula Aren', price: 18000, stock: 50, image: 'https://placehold.co/100x100.png', dataAiHint: 'coffee drink' },
  { id: 'prod_2', name: 'Roti Coklat Keju', price: 10000, stock: 100, image: 'https://placehold.co/100x100.png', dataAiHint: 'chocolate bread' },
  { id: 'prod_3', name: 'Air Mineral Botol', price: 5000, stock: 200, image: 'https://placehold.co/100x100.png', dataAiHint: 'water bottle' },
  { id: 'prod_4', name: 'Teh Manis Hangat', price: 8000, stock: 70, image: 'https://placehold.co/100x100.png', dataAiHint: 'tea drink' },
  { id: 'prod_5', name: 'Nasi Goreng Spesial', price: 25000, stock: 30, image: 'https://placehold.co/100x100.png', dataAiHint: 'fried rice' },
  { id: 'prod_6', name: 'Kentang Goreng', price: 15000, stock: 60, image: 'https://placehold.co/100x100.png', dataAiHint: 'french fries' },
];

interface CartItem {
  product: typeof mockProducts[0];
  quantity: number;
}

export default function POSPage() {
  // Basic state for cart and payment (will be more complex in a real app)
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = React.useState(0);

  const addToCart = (product: typeof mockProducts[0]) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    }
  };
  
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  // PPN and Discount are from settings, hardcoded here for now
  const ppnRate = 0.11; // 11%
  const discountRate = 0.05; // 5%
  const discountAmount = subtotal * discountRate;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const ppnAmount = subtotalAfterDiscount * ppnRate;
  const totalAmount = subtotalAfterDiscount + ppnAmount;
  const changeGiven = paymentMethod === 'cash' && cashReceived > totalAmount ? cashReceived - totalAmount : 0;

  const filteredProducts = mockProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePayment = () => {
    // Mock payment processing & receipt printing
    console.log("Processing payment:", { cart, totalAmount, paymentMethod, cashReceived });
    const receiptContent = `
    ================================
            TOKO APP RECEIPT
    ================================
    Date: ${new Date().toLocaleString()}
    --------------------------------
    Items:
    ${cart.map(item => `${item.product.name} (x${item.quantity}) : Rp ${item.product.price * item.quantity}`).join('\n    ')}
    --------------------------------
    Subtotal:        Rp ${subtotal.toFixed(2)}
    Discount (${(discountRate*100).toFixed(0)}%):  - Rp ${discountAmount.toFixed(2)}
    PPN (${(ppnRate*100).toFixed(0)}%):          Rp ${ppnAmount.toFixed(2)}
    --------------------------------
    TOTAL:           Rp ${totalAmount.toFixed(2)}
    --------------------------------
    Payment Method:  ${paymentMethod.toUpperCase()}
    ${paymentMethod === 'cash' ? `Cash Received:   Rp ${cashReceived.toFixed(2)}` : ''}
    ${paymentMethod === 'cash' ? `Change:          Rp ${changeGiven.toFixed(2)}` : ''}
    ================================
            THANK YOU!
    ================================
    `;
    console.log("Mock ESC/POS Receipt:\n", receiptContent);
    alert(`Payment successful! Total: Rp ${totalAmount.toFixed(2)}. Receipt printed to console.`);
    setCart([]);
    setCashReceived(0);
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-3 gap-2 text-center shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                >
                  <Image src={product.image} alt={product.name} width={80} height={80} className="rounded-md object-cover aspect-square" data-ai-hint={product.dataAiHint}/>
                  <span className="text-xs font-medium line-clamp-2">{product.name}</span>
                  <span className="text-xs text-primary font-semibold">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}
                  </span>
                  {product.stock <= 0 && <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
                </Button>
              ))}
               {filteredProducts.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-10">No products match your search.</p>
              )}
            </div>
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
                  <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50">
                    <Image src={item.product.image} alt={item.product.name} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint={item.product.dataAiHint}/>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.product.price)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                      className="w-16 h-8 text-center"
                      min="0"
                    />
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.product.id)}>
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
              <span>Discount ({(discountRate*100).toFixed(0)}%)</span>
              <span>- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(discountAmount)}</span>
            </div>
             <div className="flex justify-between text-sm">
              <span>PPN ({(ppnRate*100).toFixed(0)}%)</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(ppnAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold font-headline">
              <span>Total</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount)}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('cash')}>
                <DollarSign className="h-4 w-4" /> Cash
              </Button>
              <Button variant={paymentMethod === 'qris' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('qris')}>
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
                />
                {cashReceived > 0 && totalAmount > 0 && cashReceived >= totalAmount && (
                   <p className="text-sm text-muted-foreground mt-1 text-right">
                     Change: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(changeGiven)}
                   </p>
                )}
              </div>
            )}
            <Button size="lg" className="w-full font-headline mt-2" onClick={handlePayment} disabled={totalAmount <=0}>
              <CreditCard className="mr-2 h-5 w-5" /> Proceed to Payment
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Need to wrap stateful component for client directive
const POSPageClient = () => {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = React.useState(0);

  const addToCart = (product: typeof mockProducts[0]) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    }
  };
  
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const ppnRate = 0.11; 
  const discountRate = 0.05; 
  const discountAmount = subtotal * discountRate;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const ppnAmount = subtotalAfterDiscount * ppnRate;
  const totalAmount = subtotalAfterDiscount + ppnAmount;
  const changeGiven = paymentMethod === 'cash' && cashReceived > totalAmount ? cashReceived - totalAmount : 0;

  const filteredProducts = mockProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePayment = () => {
    console.log("Processing payment:", { cart, totalAmount, paymentMethod, cashReceived });
    const receiptContent = `...`; // Same receipt logic
    console.log("Mock ESC/POS Receipt:\n", receiptContent);
    alert(`Payment successful! Total: Rp ${totalAmount.toFixed(2)}. Receipt printed to console.`);
    setCart([]);
    setCashReceived(0);
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-3 gap-2 text-center shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                >
                  <Image src={product.image} alt={product.name} width={80} height={80} className="rounded-md object-cover aspect-square" data-ai-hint={product.dataAiHint}/>
                  <span className="text-xs font-medium line-clamp-2">{product.name}</span>
                  <span className="text-xs text-primary font-semibold">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}
                  </span>
                  {product.stock <= 0 && <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
                </Button>
              ))}
               {filteredProducts.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-10">No products match your search.</p>
              )}
            </div>
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
                  <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50">
                    <Image src={item.product.image} alt={item.product.name} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint={item.product.dataAiHint}/>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.product.price)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value))}
                      className="w-16 h-8 text-center"
                      min="0"
                    />
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.product.id)}>
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
              <span>Discount ({(discountRate*100).toFixed(0)}%)</span>
              <span>- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(discountAmount)}</span>
            </div>
             <div className="flex justify-between text-sm">
              <span>PPN ({(ppnRate*100).toFixed(0)}%)</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(ppnAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold font-headline">
              <span>Total</span>
              <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount)}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('cash')}>
                <DollarSign className="h-4 w-4" /> Cash
              </Button>
              <Button variant={paymentMethod === 'qris' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setPaymentMethod('qris')}>
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
                />
                {cashReceived > 0 && totalAmount > 0 && cashReceived >= totalAmount && (
                   <p className="text-sm text-muted-foreground mt-1 text-right">
                     Change: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(changeGiven)}
                   </p>
                )}
              </div>
            )}
            <Button size="lg" className="w-full font-headline mt-2" onClick={handlePayment} disabled={totalAmount <=0}>
              <CreditCard className="mr-2 h-5 w-5" /> Proceed to Payment
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
