'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from '../../components/Auth/AuthForm';


export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');

  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      await register(name, email, password);
      router.push('/boards');
    } catch (err) {
      setError('Failed to register');
    }
  };

  return <AuthForm mode="register" onSubmit={handleRegister} error={error} />;
}
