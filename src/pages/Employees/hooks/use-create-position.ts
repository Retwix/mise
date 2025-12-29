import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type CreatePositionData = {
  name: string;
};

export const useCreatePosition = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const createPosition = async (data: CreatePositionData) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    const { error: insertError } = await supabase
      .from('positions')
      .insert([{ name: data.name }])
      .select();

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return { success: false, error: insertError.message };
    }

    setIsSuccess(true);
    setIsLoading(false);
    return { success: true, error: null };
  };

  const resetState = () => {
    setError(null);
    setIsSuccess(false);
  };

  return {
    createPosition,
    isCreatePositionLoading: isLoading,
    createPositionError: error,
    isCreatePositionSuccess: isSuccess,
    resetCreatePositionState: resetState,
  };
};
