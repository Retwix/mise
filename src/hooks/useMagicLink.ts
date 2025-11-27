import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MagicLinkState = {
  isCheckingOTPToken: boolean;
  authError: string | null;
  authSuccess: boolean;
};

export const useMagicLink = () => {
  const [state, setState] = useState<MagicLinkState>({
    isCheckingOTPToken: false,
    authError: null,
    authSuccess: false,
  });

  useEffect(() => {
    // Check if we have token_hash in URL (magic link callback)
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    if (tokenHash === null) return;

    setState((prev) => ({ ...prev, isCheckingOTPToken: true }));
    // Verify the OTP token
    supabase.auth
      .verifyOtp({
        token_hash: tokenHash,
        type: (type as 'email' | 'signup') || 'email',
      })
      .then(({ error }) => {
        if (error) {
          setState({
            isCheckingOTPToken: false,
            authError: error.message,
            authSuccess: false,
          });
        } else {
          setState({
            isCheckingOTPToken: false,
            authError: null,
            authSuccess: true,
          });
          // Clear URL params
          window.history.replaceState({}, document.title, '/');
        }
      });
  }, []);

  const clearError = () => {
    setState({
      isCheckingOTPToken: false,
      authError: null,
      authSuccess: false,
    });
    window.history.replaceState({}, document.title, '/');
  };

  return {
    ...state,
    clearError,
  };
};
