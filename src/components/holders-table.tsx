import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-raw";
import usePause from "@/hooks/use-pause";
import { useTokenHolders } from "@/hooks/use-websocket-data";
import { IToken } from "@/types";
import { shortenAddress } from "@/utils";
import { RefreshCw } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import PausedIndicator from "./paused-indicator";
import React from "react";

export default function HoldersTable({ token }: { token: IToken }) {
  const { paused, setPause } = usePause();
  console.log(
    `HoldersTable: Rendering for token ${token?.ticker} (${token?.mint})`,
  );

  // Use the WebSocket hook instead of React Query
  const { holders, total, loading, error, refetch } = useTokenHolders(token?.mint);
  
  console.log(`HoldersTable: RECEIVED DATA:`, {
    holdersLength: holders?.length || 0,
    holdersData: holders,
    total,
    loading,
    error,
    paused,
    mint: token?.mint
  });

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
        console.log(`HoldersTable: Auto-refreshing holders data for ${token?.mint}`);
        refetch();
      }, 30000); // 30 seconds interval
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [paused, token?.mint, refetch]);

  return (
    <Table
      className="border-0 !rounded-0 !border-spacing-y-0"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      <TableHeader className="relative">
        <PausedIndicator show={paused} />
        <TableRow className="bg-transparent">
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="animate-spin size-5 text-autofun-text-secondary" />
                <p className="text-autofun-text-secondary">
                  Fetching holders via WebSocket...
                </p>
              </div>
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="text-center py-8 text-autofun-text-secondary"
            >
              <div className="flex flex-col items-center gap-2">
                <p>Error fetching holders: {error}</p>
                <button 
                  onClick={() => refetch()} 
                  className="text-autofun-text-highlight hover:underline flex items-center gap-1"
                >
                  Try again <RefreshCw className="size-4" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ) : holders && holders.length > 0 ? (
          holders.map((holder: any) => {
            console.log('Rendering holder:', holder);
            return (
              <TableRow className="hover:bg-white/5" key={holder?.address}>
                <TableCell className="text-left">
                  <Link
                    to={`https://solscan.io/account/${holder?.address}`}
                    target="_blank"
                    className="hover:text-autofun-text-highlight"
                  >
                    {shortenAddress(holder?.address)}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {(holder?.amount || holder?.balance || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {holder?.percentage}%
                </TableCell>
                <TableCell>
                  <Link
                    to={`https://solscan.io/account/${holder?.address}`}
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
              colSpan={4}
              className="text-center py-8 text-autofun-text-secondary"
            >
              <div className="flex flex-col items-center gap-2">
                <p>No holders data available.</p>
                <Link
                  to={`https://solscan.io/token/${token?.mint}#holders`}
                  target="_blank"
                  className="text-autofun-text-highlight hover:underline flex items-center gap-1"
                >
                  View all token holders on Solscan{" "}
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
