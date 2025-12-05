/**
 * Tests for QueryClientProvider component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@/components/providers/QueryClientProvider';
import { useQuery } from '@tanstack/react-query';

// Test component that uses useQuery to verify the provider works
function TestComponent() {
  const { data } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test-data'),
  });
  
  return <div data-testid="test-content">{data || 'loading'}</div>;
}

describe('QueryClientProvider', () => {
  it('should render children', () => {
    render(
      <QueryClientProvider>
        <div data-testid="child">Test Child</div>
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should provide QueryClient context to children', async () => {
    render(
      <QueryClientProvider>
        <TestComponent />
      </QueryClientProvider>
    );
    
    // Initially should show loading
    expect(screen.getByTestId('test-content')).toHaveTextContent('loading');
    
    // After query resolves, should show data
    const content = await screen.findByText('test-data');
    expect(content).toBeInTheDocument();
  });

  it('should allow nested components to use React Query hooks', async () => {
    const NestedComponent = () => {
      const { data, isLoading } = useQuery({
        queryKey: ['nested-test'],
        queryFn: () => Promise.resolve({ value: 42 }),
      });
      
      if (isLoading) return <div>Loading...</div>;
      
      return <div data-testid="nested-result">{data?.value}</div>;
    };

    render(
      <QueryClientProvider>
        <div>
          <NestedComponent />
        </div>
      </QueryClientProvider>
    );
    
    // Should eventually show the data
    const result = await screen.findByTestId('nested-result');
    expect(result).toHaveTextContent('42');
  });
});
