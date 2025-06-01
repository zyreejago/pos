
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-primary lucide lucide-shopping-cart"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.16"/></svg>
        <h1 className="text-5xl font-headline font-bold tracking-tight text-foreground sm:text-6xl">
          Welcome to <span className="text-primary">Toko App</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Your modern Point of Sale solution. Streamline your business operations, manage inventory, and track sales with ease.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="font-headline">
            <Link href="/login">
              Login to Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-headline">
            <Link href="/register">
              Create New Account
            </Link>
          </Button>
        </div>
         <p className="text-sm text-muted-foreground">
          Superadmin? Manage users <Link href="/admin/users" className="underline hover:text-primary">here</Link>.
        </p>
      </div>
      <footer className="absolute bottom-8 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Toko App. Built with Firebase Studio.</p>
      </footer>
    </div>
  );
}
