# Mean Reversion Trading Bot for Solana

A sophisticated trading bot that implements a mean reversion strategy for trading SPL tokens on Solana using Jupiter Exchange. The bot monitors price movements, identifies trading opportunities based on statistical deviations, and executes trades automatically.

## Features

- Real-time price monitoring
- Mean reversion strategy implementation
- Automatic trade execution via Jupiter
- Price history tracking and persistence
- Comprehensive error handling
- Token decimal precision handling
- Configurable trading parameters

## Prerequisites

- [Bun](https://bun.sh/) runtime environment
- Solana wallet with SOL for transaction fees
- USDC for trading
- Helius RPC URL or alternative Solana RPC endpoint

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Code-Parth/mean-reversion-bot
cd mean-reversion-bot
```

2. Install dependencies:
```bash
bun install
```

3. Configure your environment:
   - Update `wallet.ts` with your wallet credentials:
     ```typescript
     const WalletInfo1: WalletType = {
         Public_Key: "YOUR_PUBLIC_KEY",
         Private_Key: "YOUR_PRIVATE_KEY"
     };
     ```
   - Set your RPC URL in `wallet.ts`:
     ```typescript
     export const RPC_URL = "YOUR_RPC_URL";
     ```

## Configuration

The bot's behavior can be customized through the `tokenConfig` object in `mean-reversion.ts`:

```typescript
const tokenConfig: TokenConfig = {
    inputMint: "So11111111111111111111111111111111111111112",  // SOL
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
    symbol: "SOL",
    meanPeriod: 100,          // Number of price points for mean calculation
    deviationThreshold: 2,    // Standard deviations for trade signals
    tradeSize: 0.01,         // Trade size in base token
    minLiquidity: 10000      // Minimum pool liquidity in USD
};
```

## Usage

1. Start the simple swap test:
```bash
bun run start
```

2. Run the mean reversion bot:
```bash
bun run mean
```

## Project Structure

```
src/
├── config/
│   └── config.ts           # Jupiter API configuration
├── jupAPI/
│   └── jup_method.ts       # Jupiter API integration methods
├── transaction/
│   └── sendTransaction.ts  # Transaction execution logic
├── index.ts               # Simple swap test
├── mean-reversion.ts      # Main bot implementation
└── wallet.ts             # Wallet configuration
```

## Trading Strategy

The bot implements a mean reversion strategy with the following logic:

1. Monitors token prices every 3 seconds
2. Calculates moving average and standard deviation
3. Generates trading signals when price deviates significantly:
   - BUY: Price below mean by `deviationThreshold` standard deviations
   - SELL: Price above mean by `deviationThreshold` standard deviations

## Dependencies

- `@jup-ag/api`: Jupiter Exchange API integration
- `@solana/web3.js`: Solana blockchain interaction
- `axios`: HTTP client for API requests
- `bs58`: Base58 encoding/decoding
- `colorette`: Console color formatting

## Safety Features

- Minimum liquidity requirements
- Trade execution validation
- Transaction confirmation checks
- Error handling and logging
- Concurrent trade prevention

## Disclaimer

This bot is provided for educational purposes only. Trading cryptocurrencies involves significant risk. Always:
- Test thoroughly with small amounts first
- Monitor the bot's operation
- Understand the risks involved
- Secure your private keys
- Use at your own risk

## License

[MIT License](LICENSE)
