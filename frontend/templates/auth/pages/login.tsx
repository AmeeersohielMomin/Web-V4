import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthForm } from '../components/AuthForm';
import { authService } from '../services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success && response.data?.token) {
        authService.setToken(response.data.token);
        router.push('/dashboard');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      onSubmit={handleLogin}
      error={error}
      loading={loading}
    />
  );
}
