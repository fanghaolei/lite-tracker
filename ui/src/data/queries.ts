import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMortgageEstimate, refreshMortgageEstimate } from '../api';

export const queryKeys = {
  mortgageEstimate: ['mortgage', 'estimate'] as const
};

export function useMortgageEstimateQuery() {
  return useQuery({
    queryKey: queryKeys.mortgageEstimate,
    queryFn: fetchMortgageEstimate
  });
}

export function useRefreshMortgageEstimateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshMortgageEstimate,
    onSuccess: data => {
      queryClient.setQueryData(queryKeys.mortgageEstimate, data);
    }
  });
}
