import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-raw";
import usePause from "@/hooks/use-pause";
import { useTokenTransactions } from "@/hooks/use-websocket-data";
import { IToken } from "@/types";
import { fromNow, shortenAddress } from "@/utils";
import { TokenTransaction } from "@/utils/blockchain";
import { ExternalLink, RefreshCw } from "lucide-react";
import React from "react";
import { Link } from "react-router";
import { twMerge } from "tailwind-merge";
import PausedIndicator from "./paused-indicator";

export default function SwapsTable({ token }: { token: IToken }) {
  const { paused, setPause } = usePause();

  console.log(
    `SwapsTable: Rendering for token ${token?.ticker} (${token?.mint})`,
  );

  // Use the WebSocket hook instead of React Query
  const { swaps, loading, error, refetch } = useTokenTransactions(token?.mint);

  // Only refetch when not paused
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Only set up interval if not paused
    if (!paused && token?.mint) {
      intervalRef.current = setInterval(() => {
        console.log(`SwapsTable: Auto-refreshing swaps data for ${token?.mint}`);
        refetch();
      }, 30000); // 30 seconds interval
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [paused, token?.mint, refetch]);

  // Helper to format swap amounts based on type
  const formatSwapAmount = (amount: number | string, isToken: boolean) => {
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) return "0";

    if (isToken) {
      // Format token amount
      if (numericAmount >= 1000000) {
        return `${(numericAmount / 1000000).toFixed(2)}M`;
      } else if (numericAmount >= 1000) {
        return `${(numericAmount / 1000).toFixed(2)}K`;
      } else {
        return numericAmount.toFixed(2);
      }
    } else {
      // Format SOL amount - convert from lamports to SOL
      return (numericAmount / 1e9).toFixed(4);
    }
  };

  return (
    <Table
      className="border-0 !rounded-0 !border-spacing-y-0"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      <PausedIndicator show={paused} />
      <TableHeader>
        <TableRow className="bg-transparent">
          <TableHead>Account</TableHead>
          <TableHead className="text-left">Type</TableHead>
          <TableHead className="text-left">SOL</TableHead>
          <TableHead className="text-left">Token</TableHead>
          <TableHead className="text-left w-[150px]">Date</TableHead>
          <TableHead className="text-right">Txn</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="animate-spin size-5 text-autofun-text-secondary" />
                <p className="text-autofun-text-secondary">
                  Fetching transactions via WebSocket...
                </p>
              </div>
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-8 text-autofun-text-secondary"
            >
              <div className="flex flex-col items-center gap-2">
                <p>Error fetching transactions: {error}</p>
                <button 
                  onClick={() => refetch()} 
                  className="text-autofun-text-highlight hover:underline flex items-center gap-1"
                >
                  Try again <RefreshCw className="size-4" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ) : swaps.length > 0 ? (
          swaps.map((swap: TokenTransaction) => {
            const isBuy = swap?.direction === 0;
            return (
              <TableRow className="hover:bg-white/5" key={swap?.txId}>
                <TableCell className="text-left">
                  <Link
                    to={`https://solscan.io/account/${swap?.user}`}
                    target="_blank"
                    className="hover:text-autofun-text-highlight"
                  >
                    {shortenAddress(swap?.user)}
                  </Link>
                </TableCell>
                <TableCell
                  className={twMerge([
                    "text-left",
                    isBuy ? "text-[#2FD345]" : "text-[#EF5350]",
                  ])}
                >
                  {isBuy ? "Buy" : "Sell"}
                </TableCell>
                <TableCell className="text-left">
                  {formatSwapAmount(swap?.amountIn || 0, !isBuy)}
                </TableCell>
                <TableCell className="text-left">
                  {formatSwapAmount(swap?.amountOut || 0, isBuy)}
                </TableCell>
                <TableCell className="text-left">
                  {fromNow(swap?.timestamp)}
                </TableCell>
                <TableCell>
                  <Link
                    to={`https://solscan.io/tx/${swap?.txId}`}
                    target="_blank"
                  >
                    <ExternalLink className="ml-auto size-4 text-autofun-icon-secondary" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-8 text-autofun-text-secondary"
            >
              <div className="flex flex-col items-center gap-2">
                <p>No transaction data available.</p>
                <Link
                  to={`https://solscan.io/token/${token?.mint}#trades`}
                  target="_blank"
                  className="text-autofun-text-highlight hover:underline flex items-center gap-1"
                >
                  View all trades on Solscan <ExternalLink className="size-4" />
                </Link>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
