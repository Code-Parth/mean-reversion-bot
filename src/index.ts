import { WALLET } from "./wallet";
import { executeSwap } from "./jupAPI/jup_method";

executeSwap({
    inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    outputMint: "So11111111111111111111111111111111111111112",
    amount: 1,
    wallet: WALLET.WalletInfo1
}).then(console.log).catch(console.error);
