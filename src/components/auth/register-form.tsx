
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
import { User as UserIconStandard, Mail, Lock } from 'lucide-react'; // Renamed to avoid conflict if User type is imported
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, serverTimestamp } from '@/lib/firebase'; // Import db and serverTimestamp
import { doc, setDoc } from "firebase/firestore";
import type { User } from '@/types'; // Import your User type


const registerFormSchema = z.object({
  merchantName: z.string().min(2, { message: "Merchant name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      merchantName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Update Firebase Auth profile (optional but good practice)
        await updateProfile(firebaseUser, { displayName: values.merchantName });

        // Create user document in Firestore for a new merchant admin
        const newUserDoc: User = {
          id: firebaseUser.uid,
          name: values.merchantName, // This is the merchant's name, also used as admin's display name initially
          email: values.email,
          role: 'admin', // New registrations are merchant admins
          status: 'pending_approval', // New merchants need approval by superadmin
          merchantId: firebaseUser.uid, // The new admin is the "owner" of this new merchant entity
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);

        toast({
          title: "Registration Successful!",
          description: "Your merchant account has been created and is awaiting approval.",
        });
        router.push("/login"); // Redirect to login page after successful registration
      }
    } catch (error: any) {
      console.error("Firebase registration error:", error);
      let errorMessage = "Registration failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please try logging in.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-headline font-bold text-foreground">Create Your Merchant Account</h1>
        <p className="text-muted-foreground">Sign up to start managing your business with Toko App.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="merchantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Merchant/Business Name</FormLabel>
                <div className="relative">
                  <UserIconStandard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="Your Business Name" {...field} className="pl-10" disabled={isLoading} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Admin Email Address</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} className="pl-10" disabled={isLoading} />
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
                    <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isLoading} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Confirm Password</FormLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isLoading} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full font-headline" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register My Merchant"}
          </Button>
        </form>
      </Form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline hover:text-accent transition-colors">
          Sign in
        </Link>
      </p>
    </>
  );
}
