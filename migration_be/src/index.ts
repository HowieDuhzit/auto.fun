import { Connection, PublicKey, Logs } from "@solana/web3.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

import { processTransactionLogs } from "./processTransactionLogs";
import { getDB } from "./db";
import { checkMigratingTokens } from "./raydium/migration/migrations";

dotenv.config();

// catch any uncaught exceptions / rejections so we stay alive
process.on("uncaughtException", (err) => {
   console.error("❌ Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
   console.error("❌ Unhandled rejection:", reason);
});

const SOLANA_NETWORK = process.env.NETWORK ?? "devnet";
const RPC_URL = SOLANA_NETWORK === "devnet"
   ? process.env.DEVNET_SOLANA_RPC_URL
   : process.env.MAINNET_SOLANA_RPC_URL;
const PROGRAM_ID = process.env.PROGRAM_ID!;
const CF_EVENT_HOOK_URL = `${process.env.VITE_API_URL}/api/migration/update`;
const CF_AUTH_TOKEN = process.env.HELIUS_WEBHOOK_AUTH_TOKEN!;

if (!RPC_URL || !PROGRAM_ID || !CF_AUTH_TOKEN) {
   console.error("❌ Missing required environment variables");
   process.exit(1);
}

// initialize your local DB (will create file if needed)
try {
   getDB(process.env as any);
} catch (err) {
   console.error("❌ Failed to initialize DB:", err);
   // we continue anyway—you may choose to exit here if it's fatal
}

// try {
//    async function resume(env: any) {

//       checkMigratingTokens(env, 1);
//    }
//    resume(process.env as any);
// } catch (err) {
//    console.error("❌ Error during migration:", err);
// }

const connection = new Connection(RPC_URL, "confirmed");
const programId = new PublicKey(PROGRAM_ID);

console.log("🚀 Listening on", SOLANA_NETWORK, "via", RPC_URL);


let subId: number;
function startLogSubscription() {
   try {
      subId = connection.onLogs(
         programId,
         async (logs: Logs) => {
            try {
               if (logs.err) {
                  console.warn("⚠️  Transaction errored:", logs.err);
                  return;
               }
               const result = await processTransactionLogs(process.env as any, logs.logs, logs.signature);
               console.log("👉 Result:", result);
            } catch (innerErr) {
               console.error("❌ Error in onLogs handler:", innerErr);
            }
         },
         "confirmed"
      );
      console.log("✅ Subscribed with id", subId);
   } catch (err) {
      console.error("❌ Failed to subscribe:", err);
   }
}

// Watchdog 
setInterval(async () => {
   try {
      // A simple RPC heartbeat
      await connection.getVersion();
   } catch (err) {
      console.error("❌ RPC heartbeat failed, recreating subscription:", err);
      try {
         await connection.removeOnLogsListener(subId);
      } catch (_) { /* ignore */ }
      startLogSubscription();
   }
}, 30_000); // every 30s

//Start
startLogSubscription();

// Graceful shutdown
process.on("SIGINT", async () => {
   console.log("\n👋 Shutting down…");
   try {
      await connection.removeOnLogsListener(subId);
   } catch (err) {
      console.error("❌ Error removing listener:", err);
   }
   process.exit(0);
});