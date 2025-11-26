import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) setError(error.message);
    else setSuccess(true);

    setIsLoading(false);
  };

  return {
    email,
    setEmail,
    loading: isLoading,
    error,
    success,
    handleLogin,
  };
};
