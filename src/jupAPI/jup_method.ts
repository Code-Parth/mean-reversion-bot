import axios from "axios";
import { JUPITER_URL } from "./config";
import type { WalletType } from "../wallet";
import type { SwapRequest, SwapResponse } from "@jup-ag/api";
import { sendTransaction } from "../transaction/sendTransaction";
import type { QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

export interface TokenInfoResponse {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    tags: string[];
    daily_volume: number;
    created_at: Date;
    freeze_authority: string;
    mint_authority: string;
    permanent_delegate: null;
    minted_at: null;
    extensions: Extensions;
}

export interface Extensions {
    coingeckoId: string;
}

interface ExecuteSwapType {
    inputMint: string;
    outputMint: string;
    amount: number;
    wallet: WalletType;
}

export async function getTokenInfo(mint: string): Promise<TokenInfoResponse> {
    const response = await axios.get(`${JUPITER_URL}/tokens/v1/token/${mint}`);

    return response.data;
}

export async function getQuote({ inputMint, outputMint, amount }: QuoteGetRequest): Promise<QuoteResponse> {
    const tokenInfo = await getTokenInfo(inputMint);

    const params: QuoteGetRequest = {
        inputMint: inputMint,
        outputMint: outputMint,
        amount: amount * (10 ** tokenInfo.decimals),
    }

    const response = await axios.get(`${JUPITER_URL}/swap/v1/quote`, { params });

    return response.data;
}

export async function buildSwap({ userPublicKey, quoteResponse }: SwapRequest): Promise<SwapResponse> {
    const params: SwapRequest = {
        userPublicKey: userPublicKey,
        quoteResponse: quoteResponse,
    };

    const response = await axios.post(`${JUPITER_URL}/swap/v1/swap`, params);

    return response.data;
}

export async function executeSwap({ inputMint, outputMint, amount, wallet }: ExecuteSwapType): Promise<string> {
    const quote = await getQuote({
        inputMint: inputMint,
        outputMint: outputMint,
        amount: amount
    });

    const swapResponse = await buildSwap({
        userPublicKey: wallet.Public_Key,
        quoteResponse: quote
    });

    const transaction = await sendTransaction(swapResponse.swapTransaction, wallet);

    return transaction;
}
