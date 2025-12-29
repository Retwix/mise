import { useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const PositionSchema = z.object({
  name: z.string(),
});

const PositionsArraySchema = z.array(PositionSchema);

type Position = z.infer<typeof PositionSchema>;

export const useLoadPositions = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPositions = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase.from('positions').select('*');

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    const parseResult = PositionsArraySchema.safeParse(data);
    if (!parseResult.success) {
      setError('Invalid data format received from server');
      console.error('Zod validation error:', parseResult.error);
      setIsLoading(false);
      return;
    }

    setPositions(parseResult.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPositions();
  }, []);

  return {
    positions,
    isLoadPositionsLoading: isLoading,
    loadPositionsError: error,
    refetchPositions: loadPositions,
  };
};
