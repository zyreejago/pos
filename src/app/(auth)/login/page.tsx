import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Toko App',
  description: 'Login to your Toko App account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
