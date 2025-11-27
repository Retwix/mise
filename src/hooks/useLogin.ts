import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    setIsSuccess(false);

    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) setLoginError(error.message);
    else setIsSuccess(true);

    setIsLoading(false);
  };

  return {
    loginEmail,
    setLoginEmail,
    isLoading,
    loginError,
    isSuccess,
    handleLogin,
  };
};
