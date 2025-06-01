
"use client";

import Link from 'next/link';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          // Store essential user data in localStorage.
          // We use 'mockUser' key for now to maintain compatibility with AppLayout/AppHeader
          // Ideally, this should be renamed or handled via context/state management.
          localStorage.setItem('mockUser', JSON.stringify({ 
            id: firebaseUser.uid, // Use actual UID
            email: userData.email, 
            displayName: userData.name, 
            role: userData.role,
            merchantId: userData.merchantId 
          }));

          toast({
            title: "Login Successful!",
            description: `Welcome back, ${userData.name}!`,
          });

          if (userData.role === 'superadmin') {
            router.push("/admin/users");
          } else if (userData.role === 'admin' || userData.role === 'kasir') {
            // Check if merchant is approved
            if (userData.status === 'pending_approval') {
                toast({
                    title: "Account Pending Approval",
                    description: "Your merchant account is still awaiting approval from the superadmin.",
                    variant: "destructive",
                });
                 await auth.signOut(); // Log out user
                 localStorage.removeItem('mockUser');
                 setIsLoading(false);
                 return;
            }
            if (userData.status === 'inactive') {
                 toast({
                    title: "Account Inactive",
                    description: "Your account is currently inactive. Please contact support.",
                    variant: "destructive",
                });
                 await auth.signOut(); // Log out user
                 localStorage.removeItem('mockUser');
                 setIsLoading(false);
                 return;
            }
            router.push("/select-outlet");
          } else {
             router.push("/dashboard"); // Fallback
          }
        } else {
          toast({
            title: "Login Error",
            description: "User data not found. Please contact support.",
            variant: "destructive",
          });
          await auth.signOut(); // Log out user if their Firestore doc is missing
        }
      }
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let errorMessage = "Login failed. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many login attempts. Please try again later.";
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-headline font-bold text-foreground">Welcome Back!</h1>
        <p className="text-muted-foreground">Sign in to continue to Toko App.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Email Address</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Password</FormLabel>
                 <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between text-sm">
            <Link href="#" className="font-medium text-primary hover:underline hover:text-accent transition-colors">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full font-headline" disabled={isLoading}>
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </Form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline hover:text-accent transition-colors">
          Sign up
        </Link>
      </p>
    </>
  );
}
