import bs58 from "bs58";
import { RPC_URL, type WalletType } from "../wallet";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js"

export async function sendTransaction(transactionBase64: string, wallet: WalletType): Promise<string> {
    const transaction = VersionedTransaction.deserialize(Buffer.from(transactionBase64, "base64"));

    transaction.sign([Keypair.fromSecretKey(bs58.decode(wallet.Private_Key))]);

    const connection = new Connection(RPC_URL);

    const transactionBinary = transaction.serialize();
    const signature = await connection.sendRawTransaction(
        transactionBinary,
        {
            maxRetries: 2,
            skipPreflight: true
        }
    );

    const confirmation = await connection.confirmTransaction(signature, "finalized");

    if (confirmation.value.err) {
        console.error(`Transaction failed: ${confirmation.value.err}`);
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
    } else {
        console.log(`Transaction successful: https://solana.fm/tx/${signature}/`);
        return signature;
    }
}
