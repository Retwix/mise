import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MagicLinkState = {
  isCheckingOTPToken: boolean;
  magicLinkError: string | null;
  isMagicLinkValid: boolean;
};

export const useMagicLink = () => {
  const [state, setState] = useState<MagicLinkState>({
    isCheckingOTPToken: false,
    magicLinkError: null,
    isMagicLinkValid: false,
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
            magicLinkError: error.message,
            isMagicLinkValid: false,
          });
        } else {
          setState({
            isCheckingOTPToken: false,
            magicLinkError: null,
            isMagicLinkValid: true,
          });
          // Clear URL params
          window.history.replaceState({}, document.title, '/');
        }
      });
  }, []);

  const clearError = () => {
    setState({
      isCheckingOTPToken: false,
      magicLinkError: null,
      isMagicLinkValid: false,
    });
    window.history.replaceState({}, document.title, '/');
  };

  return {
    ...state,
    clearError,
  };
};
