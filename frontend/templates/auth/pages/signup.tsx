import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthForm } from '../components/AuthForm';
import { authService } from '../services/auth.service';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const response = await authService.signup(email, password);

      if (response.success && response.data?.token) {
        authService.setToken(response.data.token);
        router.push('/dashboard');
      } else {
        setError(response.error || 'Signup failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="signup"
      onSubmit={handleSignup}
      error={error}
      loading={loading}
    />
  );
}
