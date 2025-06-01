import { RegisterForm } from '@/components/auth/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register - Toko App',
  description: 'Create a new Toko App account.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
