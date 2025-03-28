import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { Autofun } from "./program";
import { BN, Program } from "@coral-xyz/anchor";

// export const waitForTokenCreation = async (mint: string, timeout = 80_000) => {
//   return new Promise<void>((resolve, reject) => {
//     const socket = getSocket();

//     const newTokenListener = ({mint: newMint}: Token) => {
//       if (newMint === mint) {
//         clearTimeout(timerId);
//         socket.off("newToken", newTokenListener as any);
//         resolve();
//       }
//     };

//     socket.emit("subscribeGlobal");
//     socket.on("newToken", newTokenListener as any);

//     const timerId = setTimeout(() => {
//       socket.off("newToken", newTokenListener as any);
//       reject(new Error("Token creation timed out"));
//     }, timeout);
//   });
// };

export const launchAndSwapTx = async (
  creator: PublicKey,
  decimals: number,
  tokenSupply: number,
  virtualLamportReserves: number,
  name: string,
  symbol: string,
  uri: string,
  swapAmount: number,
  slippageBps: number = 100,
  connection: Connection,
  program: Program<Autofun>,
  mintKeypair: Keypair,
  configAccount: {
    teamWallet: PublicKey;
    initBondingCurve: number;
  }
) => {
  // Calculate deadline
  const deadline = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now

  // Calculate minimum receive amount based on bonding curve formula
  // This is an estimate and should be calculated more precisely based on the bonding curve
  const initBondingCurvePercentage = configAccount.initBondingCurve;
  const initBondingCurveAmount =
    (tokenSupply * initBondingCurvePercentage) / 100;

  // Calculate expected output using constant product formula: dy = (y * dx) / (x + dx)
  // where x = reserveToken, y = reserveLamport, dx = swapAmount
  const numerator = virtualLamportReserves * swapAmount;
  const denominator = initBondingCurveAmount + swapAmount;
  const expectedOutput = Math.floor(numerator / denominator);

  // Apply slippage to expected output
  const minOutput = Math.floor(
    (expectedOutput * (10000 - slippageBps)) / 10000
  );

  const tx = await program.methods
    .launchAndSwap(
      decimals,
      new BN(tokenSupply),
      new BN(virtualLamportReserves),
      name,
      symbol,
      uri,
      new BN(swapAmount),
      new BN(minOutput),
      new BN(deadline)
    )
    .accounts({
      teamWallet: configAccount.teamWallet,
      creator: creator,
      token: mintKeypair.publicKey,
    })
    .transaction();

  tx.feePayer = creator;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return tx;
};
