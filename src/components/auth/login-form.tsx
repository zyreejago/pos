
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
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { auth } from '@/lib/firebase'; // Firebase import removed
import { useToast } from '@/hooks/use-toast';

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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock login logic
    if (values.email === "test@example.com" && values.password === "password") {
      toast({
        title: "Login Successful! (Mock)",
        description: "Welcome back!",
      });
      // Store mock user in localStorage for app-header to pick up
      localStorage.setItem('mockUser', JSON.stringify({ email: values.email, displayName: 'Test User' }));
      router.push("/dashboard");
    } else if (values.email === "super@tokoapp.com" && values.password === "password"){
       toast({
        title: "Login Successful! (Mock Superadmin)",
        description: "Welcome Super Admin!",
      });
      localStorage.setItem('mockUser', JSON.stringify({ email: values.email, displayName: 'Super Admin', role: 'superadmin' }));
      router.push("/admin/users");
    }
    
    else {
      toast({
        title: "Login Failed (Mock)",
        description: "Invalid email or password for mock login.",
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
