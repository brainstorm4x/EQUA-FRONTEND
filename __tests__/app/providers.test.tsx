/**
 * Tests for Providers component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Providers } from '../../app/providers';
import { useQuery } from '@tanstack/react-query';

// Mock the WalletProvider since it has complex wallet dependencies
jest.mock('@/components/WalletProvider', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-provider">{children}</div>
}));

// Mock WebVitalsClient since it's not relevant for provider tests
jest.mock('@/components/WebVitalsClient', () => ({
  WebVitalsClient: () => null
}));

// Test component that uses useQuery to verify the provider works
function TestComponent() {
  const { data } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test-data'),
  });
  
  return <div data-testid="test-content">{data || 'loading'}</div>;
}

describe('Providers', () => {
  it('should render children', () => {
    render(
      <Providers>
        <div data-testid="child">Test Child</div>
      </Providers>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should provide QueryClient context to children', async () => {
    render(
      <Providers>
        <TestComponent />
      </Providers>
    );
    
    // Initially should show loading
    expect(screen.getByTestId('test-content')).toHaveTextContent('loading');
    
    // After query resolves, should show data
    const content = await screen.findByText('test-data');
    expect(content).toBeInTheDocument();
  });

  it('should wrap children with WalletProvider', () => {
    render(
      <Providers>
        <div data-testid="child">Test</div>
      </Providers>
    );
    
    // Check that WalletProvider is in the tree
    expect(screen.getByTestId('wallet-provider')).toBeInTheDocument();
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
      <Providers>
        <div>
          <NestedComponent />
        </div>
      </Providers>
    );
    
    // Should eventually show the data
    const result = await screen.findByTestId('nested-result');
    expect(result).toHaveTextContent('42');
  });
});
