import { IToken } from "@/types";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import Button from "./button";
import HoldersTable from "./holders-table";
import SwapsTable from "./swaps-table";

export default function TransactionsAndHolders({ token }: { token: IToken }) {
  const [mode, setMode] = useState<"transactions" | "holders">("transactions");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      toast.info("Refreshing blockchain data...");

      // Trigger a custom event that our components can listen for
      document.dispatchEvent(
        new CustomEvent("refresh-blockchain-data", {
          detail: { tokenMint: token.mint },
        }),
      );

      // Also refresh chart data
      document.dispatchEvent(
        new CustomEvent("refresh-chart-data", {
          detail: { tokenMint: token.mint },
        }),
      );

      // Simulate a delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Blockchain data refresh triggered");
    } catch (error) {
      console.error("Error refreshing blockchain data:", error);
      toast.error("Could not refresh blockchain data. Please try again later.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="border md:overflow-x-hidden xs:max-w-fit md:max-w-full bg-autofun-background-card">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center">
          <Button
            size="small"
            variant={mode === "transactions" ? "primary" : "ghost"}
            onClick={() => setMode("transactions")}
          >
            Trades
          </Button>
          <Button
            size="small"
            variant={mode === "holders" ? "primary" : "ghost"}
            onClick={() => setMode("holders")}
          >
            Holders
          </Button>
        </div>
        <Button
          size="small"
          variant="ghost"
          onClick={refreshData}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="size-4 mr-1" />
          )}
          Refresh Data
        </Button>
      </div>
      {mode === "transactions" ? (
        <SwapsTable token={token} />
      ) : (
        <HoldersTable token={token} />
      )}
    </div>
  );
}
