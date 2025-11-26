import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MagicLinkState = {
  verifying: boolean;
  authError: string | null;
  authSuccess: boolean;
};

export const useMagicLink = () => {
  const [state, setState] = useState<MagicLinkState>({
    verifying: false,
    authError: null,
    authSuccess: false,
  });

  useEffect(() => {
    // Check if we have token_hash in URL (magic link callback)
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash');
    const type = params.get('type');

    if (token_hash) {
      setState((prev) => ({ ...prev, verifying: true }));

      // Verify the OTP token
      supabase.auth
        .verifyOtp({
          token_hash,
          type: (type as 'email' | 'signup') || 'email',
        })
        .then(({ error }) => {
          if (error) {
            setState({
              verifying: false,
              authError: error.message,
              authSuccess: false,
            });
          } else {
            setState({
              verifying: false,
              authError: null,
              authSuccess: true,
            });
            // Clear URL params
            window.history.replaceState({}, document.title, '/');
          }
        });
    }
  }, []);

  const clearError = () => {
    setState({
      verifying: false,
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
