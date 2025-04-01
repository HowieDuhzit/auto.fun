import { useEffect, useState, useCallback } from "react";
import { useWebSocket, WebSocketEvent } from "./use-websocket";
import { fetchTokenHolders, fetchTokenTransactions, fetchTokenMarketMetrics } from "../utils/blockchain";

// Define a type that includes our new event types
type ExtendedWebSocketEvent = WebSocketEvent | "tokenHolders" | "tokenTransactions" | "tokenMarketMetrics";

// Hook for getting token holders via WebSocket
export function useTokenHolders(mint?: string) {
  const [holders, setHolders] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useWebSocket();
  const { connected, sendMessage, addEventListener } = socket;

  const fetchHolders = useCallback(() => {
    if (!mint || !connected) return;
    
    setLoading(true);
    setError(null);
    
    console.log(`Requesting token holders for ${mint} via WebSocket`);
    sendMessage({
      event: "tokenHolders",
      data: { mint }
    });
  }, [mint, connected, sendMessage]);

  // Function to directly fetch from blockchain
  const fetchHoldersDirectly = useCallback(async () => {
    if (!mint) return;
    
    try {
      setLoading(true);
      console.log(`Directly fetching holders from blockchain for ${mint}`);
      const holdersData = await fetchTokenHolders(mint);
      console.log(`Got ${holdersData.holders.length} holders directly from blockchain:`, holdersData);
      setHolders(holdersData.holders);
      setTotal(holdersData.total);
      setLoading(false);
    } catch (err) {
      console.error(`Error directly fetching holders for ${mint}:`, err);
      setError(`Error fetching holders: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }, [mint]);

  useEffect(() => {
    if (!mint || !connected) return;
    
    const handleTokenHolders = (data: any) => {
      console.log(`Received token holders data:`, data);
      setLoading(false);
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      // Check if we have the expected data structure
      if (data.holders && Array.isArray(data.holders)) {
        console.log(`Setting ${data.holders.length} holders from WebSocket response`);
        
        // Ensure each holder has the expected fields
        const formattedHolders = data.holders.map((holder: any) => ({
          address: holder.address,
          // Support both 'balance' and 'amount' field names
          amount: holder.amount || holder.balance || 0,
          balance: holder.balance || holder.amount || 0,
          percentage: holder.percentage || 0
        }));
        
        console.log('Formatted holders:', formattedHolders);
        setHolders(formattedHolders);
        setTotal(data.total || formattedHolders.length);
        setError(null);
      } else {
        // If we don't have the expected structure, set an error
        console.error('Unexpected data structure in tokenHolders response:', data);
        setError('Received invalid data format from server');
      }
    };
    
    // Add event listener for WebSocket messages directly from handler
    const cleanup1 = addEventListener("tokenHolders" as any, handleTokenHolders);
    
    // Also listen for echo events and immediately fetch real data
    const cleanup2 = addEventListener("echo" as any, (echoData: any) => {
      if (echoData && echoData.event === "tokenHolders" && echoData.data && echoData.data.mint === mint) {
        console.log(`Received echo for tokenHolders: ${mint}, fetching real data`);
        // Fetch real data directly from blockchain
        fetchHoldersDirectly();
      }
    });
    
    // Listen for global refresh event
    const handleRefreshEvent = (event: CustomEvent) => {
      const { tokenMint } = event.detail;
      if (tokenMint === mint) {
        console.log(`Received refresh event for token holders: ${mint}`);
        fetchHolders();
      }
    };
    
    document.addEventListener(
      "refresh-blockchain-data",
      handleRefreshEvent as EventListener
    );
    
    // Initial fetch
    fetchHolders();
    
    // Cleanup 
    return () => {
      cleanup1();
      cleanup2();
      document.removeEventListener(
        "refresh-blockchain-data",
        handleRefreshEvent as EventListener
      );
    };
  }, [mint, connected, fetchHolders, fetchHoldersDirectly, addEventListener]);
  
  return {
    holders,
    total,
    loading,
    error,
    refetch: fetchHolders // Use WebSocket for refetching
  };
}

// Hook for getting token transactions (swaps) via WebSocket
export function useTokenTransactions(mint?: string, limit = 10) {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useWebSocket();
  const { connected, sendMessage, addEventListener } = socket;

  const fetchTransactions = useCallback(() => {
    if (!mint || !connected) return;
    
    setLoading(true);
    setError(null);
    
    console.log(`Requesting token transactions for ${mint} via WebSocket (limit: ${limit})`);
    sendMessage({
      event: "tokenTransactions",
      data: { mint, limit }
    });
  }, [mint, limit, connected, sendMessage]);

  // Function to directly fetch from blockchain
  const fetchTransactionsDirectly = useCallback(async () => {
    if (!mint) return;
    
    try {
      setLoading(true);
      console.log(`Directly fetching transactions from blockchain for ${mint}`);
      const transactionsData = await fetchTokenTransactions(mint, limit);
      console.log(`Got ${transactionsData.swaps.length} transactions directly from blockchain`);
      setSwaps(transactionsData.swaps);
      setTotal(transactionsData.total);
      setLoading(false);
    } catch (err) {
      console.error(`Error directly fetching transactions for ${mint}:`, err);
      setError(`Error fetching transactions: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }, [mint, limit]);

  useEffect(() => {
    if (!mint || !connected) return;
    
    const handleTokenTransactions = (data: any) => {
      console.log(`Received token transactions data:`, data);
      setLoading(false);
      
      if (data.error) {
        setError(data.error);
      } else {
        setSwaps(data.swaps || []);
        setTotal(data.total || 0);
      }
    };
    
    // Add event listener for WebSocket messages
    const cleanup1 = addEventListener("tokenTransactions" as any, handleTokenTransactions);
    
    // Also listen for echo events and immediately fetch real data
    const cleanup2 = addEventListener("echo" as any, (echoData: any) => {
      if (echoData && echoData.event === "tokenTransactions" && echoData.data && echoData.data.mint === mint) {
        console.log(`Received echo for tokenTransactions: ${mint}, fetching real data`);
        // Fetch real data directly from blockchain
        fetchTransactionsDirectly();
      }
    });
    
    // Listen for global refresh event
    const handleRefreshEvent = (event: CustomEvent) => {
      const { tokenMint } = event.detail;
      if (tokenMint === mint) {
        console.log(`Received refresh event for token transactions: ${mint}`);
        fetchTransactions();
      }
    };
    
    document.addEventListener(
      "refresh-blockchain-data",
      handleRefreshEvent as EventListener
    );
    
    // Initial fetch
    fetchTransactions();
    
    // Cleanup
    return () => {
      cleanup1();
      cleanup2();
      document.removeEventListener(
        "refresh-blockchain-data",
        handleRefreshEvent as EventListener
      );
    };
  }, [mint, connected, fetchTransactions, fetchTransactionsDirectly, addEventListener]);
  
  return {
    swaps,
    total,
    loading,
    error,
    refetch: fetchTransactionsDirectly // Use direct fetch for refetching
  };
}

// Hook for getting token market metrics via WebSocket
export function useTokenMarketMetrics(mint?: string) {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useWebSocket();
  const { connected, sendMessage, addEventListener } = socket;

  const fetchMetrics = useCallback(() => {
    if (!mint || !connected) return;
    
    setLoading(true);
    setError(null);
    
    console.log(`Requesting token market metrics for ${mint} via WebSocket`);
    sendMessage({
      event: "tokenMarketMetrics",
      data: { mint }
    });
  }, [mint, connected, sendMessage]);

  // Function to directly fetch from blockchain
  const fetchMetricsDirectly = useCallback(async () => {
    if (!mint) return;
    
    try {
      setLoading(true);
      console.log(`Directly fetching market metrics from blockchain for ${mint}`);
      const metricsData = await fetchTokenMarketMetrics(mint);
      console.log(`Got metrics directly from blockchain:`, metricsData);
      setMetrics(metricsData);
      setLoading(false);
    } catch (err) {
      console.error(`Error directly fetching market metrics for ${mint}:`, err);
      setError(`Error fetching market metrics: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }, [mint]);

  useEffect(() => {
    if (!mint || !connected) return;
    
    const handleTokenMetrics = (data: any) => {
      console.log(`Received token market metrics data:`, data);
      setLoading(false);
      
      if (data.error) {
        setError(data.error);
      } else {
        setMetrics(data.metrics);
      }
    };
    
    // Add event listener for WebSocket messages
    const cleanup1 = addEventListener("tokenMarketMetrics" as any, handleTokenMetrics);
    
    // Also listen for echo events and immediately fetch real data
    const cleanup2 = addEventListener("echo" as any, (echoData: any) => {
      if (echoData && echoData.event === "tokenMarketMetrics" && echoData.data && echoData.data.mint === mint) {
        console.log(`Received echo for tokenMarketMetrics: ${mint}, fetching real data`);
        // Fetch real data directly from blockchain
        fetchMetricsDirectly();
      }
    });
    
    // Listen for global refresh event
    const handleRefreshEvent = (event: CustomEvent) => {
      const { tokenMint } = event.detail;
      if (tokenMint === mint) {
        console.log(`Received refresh event for token market metrics: ${mint}`);
        fetchMetrics();
      }
    };
    
    document.addEventListener(
      "refresh-blockchain-data",
      handleRefreshEvent as EventListener
    );
    
    // Initial fetch
    fetchMetrics();
    
    // Cleanup
    return () => {
      cleanup1();
      cleanup2();
      document.removeEventListener(
        "refresh-blockchain-data",
        handleRefreshEvent as EventListener
      );
    };
  }, [mint, connected, fetchMetrics, fetchMetricsDirectly, addEventListener]);
  
  return {
    metrics,
    loading,
    error,
    refetch: fetchMetricsDirectly // Use direct fetch for refetching
  };
} 