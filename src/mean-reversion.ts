import { WALLET } from "./wallet";
import { executeSwap, getQuote, getTokenInfo } from "./jupAPI/jup_method";
import fs from 'fs/promises';
import path from 'path';
import {
    blue,
    cyan,
    green,
    yellow,
    red,
    white,
    gray,
    bold
} from 'colorette';

interface PriceData {
    timestamp: number;
    price: number;
    tokenAddress: string;
    symbol: string;
}

interface TokenConfig {
    inputMint: string;
    outputMint: string;
    symbol: string;
    meanPeriod: number;
    deviationThreshold: number;
    tradeSize: number;
    minLiquidity: number;
}

class MeanReversionBot {
    private priceHistory: Map<string, PriceData[]>;
    private readonly logDir: string = 'logs';
    private readonly dataFile: string = 'price_history.json';
    private isTrading: boolean = false;
    private tokenDecimals: number | null = null;

    constructor(private tokenConfig: TokenConfig) {
        this.priceHistory = new Map();
        this.initializeLogger();
    }

    private getLogColor(type: string): (text: string) => string {
        switch (type.toLowerCase()) {
            case 'system':
                return blue;
            case 'price':
                return cyan;
            case 'trade':
                return green;
            case 'signal':
                return yellow;
            case 'error':
                return red;
            default:
                return white;
        }
    }

    private formatPrice(price: number): string {
        return bold(price.toFixed(4));
    }

    private formatTimestamp(timestamp: string): string {
        return gray(timestamp);
    }

    private async initializeLogger() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });

            try {
                const data = await fs.readFile(path.join(this.logDir, this.dataFile), 'utf-8');
                const parsed = JSON.parse(data);
                this.priceHistory = new Map(Object.entries(parsed));
                this.log('System', 'Loaded existing price history ✓');
            } catch (error) {
                this.log('System', 'Starting with fresh price history 🔄');
            }
        } catch (error) {
            red('Failed to initialize logger:');
            console.error(error);
        }
    }

    private async log(type: string, message: string) {
        const timestamp = new Date().toISOString();
        const color = this.getLogColor(type);
        const logEmoji = this.getLogEmoji(type);

        // Console output with colors
        console.log(
            `${this.formatTimestamp(timestamp)} ${logEmoji} [${color(type)}] ${message}`
        );

        // File output without colors
        const plainLogMessage = `[${timestamp}] [${type}] ${message}\n`;
        try {
            await fs.appendFile(
                path.join(this.logDir, `bot_${new Date().toISOString().split('T')[0]}.log`),
                plainLogMessage
            );
        } catch (error) {
            red('Failed to write log:');
            console.error(error);
        }
    }

    private getLogEmoji(type: string): string {
        switch (type.toLowerCase()) {
            case 'system':
                return '🔧';
            case 'price':
                return '💰';
            case 'trade':
                return '🔄';
            case 'signal':
                return '📊';
            case 'error':
                return '❌';
            default:
                return '📝';
        }
    }

    private async savePriceHistory() {
        try {
            const data = Object.fromEntries(this.priceHistory);
            await fs.writeFile(
                path.join(this.logDir, this.dataFile),
                JSON.stringify(data, null, 2)
            );
        } catch (error) {
            await this.log('Error', `Failed to save price history: ${error}`);
        }
    }

    private async updatePriceHistory(price: number) {
        const priceData: PriceData = {
            timestamp: Date.now(),
            price,
            tokenAddress: this.tokenConfig.inputMint,
            symbol: this.tokenConfig.symbol
        };

        if (!this.priceHistory.has(this.tokenConfig.inputMint)) {
            this.priceHistory.set(this.tokenConfig.inputMint, []);
        }

        const history = this.priceHistory.get(this.tokenConfig.inputMint)!;
        history.push(priceData);

        if (history.length > 1000) {
            history.shift();
        }

        await this.savePriceHistory();
    }

    private analyzeMeanReversion(): 'BUY' | 'SELL' | null {
        const history = this.priceHistory.get(this.tokenConfig.inputMint);
        if (!history || history.length < this.tokenConfig.meanPeriod) {
            return null;
        }

        const prices = history.slice(-this.tokenConfig.meanPeriod).map(d => d.price);
        const mean = prices.reduce((a, b) => a + b) / prices.length;
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        const currentPrice = prices[prices.length - 1];
        const zScore = (currentPrice - mean) / stdDev;

        // Log statistical data
        this.log('Analysis', `Mean: ${this.formatPrice(mean)} | StdDev: ${this.formatPrice(stdDev)} | Z-Score: ${this.formatPrice(zScore)}`);

        if (zScore < -this.tokenConfig.deviationThreshold) {
            return 'BUY';
        } else if (zScore > this.tokenConfig.deviationThreshold) {
            return 'SELL';
        }

        return null;
    }

    private async executeTrade(signal: 'BUY' | 'SELL') {
        if (this.isTrading) {
            await this.log('Trade', '⏳ Trade already in progress, skipping');
            return;
        }

        this.isTrading = true;
        try {
            const amount = this.tokenConfig.tradeSize;
            const inputMint = signal === 'BUY' ? this.tokenConfig.outputMint : this.tokenConfig.inputMint;
            const outputMint = signal === 'BUY' ? this.tokenConfig.inputMint : this.tokenConfig.outputMint;

            // Adjust amount based on token decimals for USDC (when buying)
            const adjustedAmount = signal === 'BUY' && this.tokenDecimals
                ? amount * Math.pow(10, this.tokenDecimals)
                : amount;

            await this.log('Trade', `${signal === 'BUY' ? '🔵' : '🔴'} Executing ${signal} for ${this.tokenConfig.symbol} - Amount: ${bold(amount.toString())}`);

            const result = await executeSwap({
                inputMint,
                outputMint,
                amount: adjustedAmount,
                wallet: WALLET.WalletInfo1
            });

            await this.log('Trade', `✅ Trade executed successfully: ${green(result)}`);
        } catch (error) {
            await this.log('Error', `Trade execution failed: ${error}`);
        } finally {
            this.isTrading = false;
        }
    }

    async start() {
        console.clear();
        console.log(bold(cyan('\n=== Mean Reversion Trading Bot ===\n')));
        await this.log('System', `Starting bot for ${bold(this.tokenConfig.symbol)} 🚀`);

        // Get token decimals at startup
        try {
            const tokenInfo = await getTokenInfo(this.tokenConfig.outputMint);
            this.tokenDecimals = tokenInfo.decimals;
            await this.log('System', `Token decimals: ${this.tokenDecimals}`);
        } catch (error) {
            await this.log('Error', `Failed to get token decimals: ${error}`);
            throw error;
        }

        // Display configuration
        console.log(yellow('\nConfiguration:'));
        console.log(gray('├──'), 'Token:', bold(this.tokenConfig.symbol));
        console.log(gray('├──'), 'Mean Period:', bold(this.tokenConfig.meanPeriod));
        console.log(gray('├──'), 'Deviation Threshold:', bold(this.tokenConfig.deviationThreshold));
        console.log(gray('└──'), 'Trade Size:', bold(this.tokenConfig.tradeSize), '\n');

        while (true) {
            try {
                const quote = await getQuote({
                    inputMint: this.tokenConfig.inputMint,
                    outputMint: this.tokenConfig.outputMint,
                    amount: 1
                });

                // Adjust price calculation based on token decimals
                const rawPrice = parseFloat(quote.outAmount);
                const currentPrice = this.tokenDecimals
                    ? rawPrice / Math.pow(10, this.tokenDecimals)
                    : rawPrice;

                await this.updatePriceHistory(currentPrice);
                await this.log('Price', `${this.tokenConfig.symbol}: ${this.formatPrice(currentPrice)} USDC`);

                const signal = this.analyzeMeanReversion();
                if (signal) {
                    await this.log('Signal', `${signal === 'BUY' ? '💚' : '❤️'} ${signal} signal for ${this.tokenConfig.symbol}`);
                    await this.executeTrade(signal);
                }

            } catch (error) {
                await this.log('Error', `${error}`);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}
const tokenConfig: TokenConfig = {
    // The token address you want to trade (in this case, SOL's token address)
    inputMint: "So11111111111111111111111111111111111111112",

    // The token you want to trade against (USDC's token address)
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",

    // Symbol for logging and display purposes
    symbol: "SOL",

    // Number of price data points to use for calculating the mean
    // Here, it uses the last 100 price points to calculate average
    meanPeriod: 100,

    // How many standard deviations away from the mean before triggering a trade
    // Value of 2 means:
    // - BUY when price is 2 standard deviations below mean
    // - SELL when price is 2 standard deviations above mean
    deviationThreshold: 2,

    // Size of each trade in input token units
    // Here, 0.01 means each trade will be 0.01 SOL
    tradeSize: 0.01,

    // Minimum liquidity required in the pool to execute trades
    // Helps avoid trading in illiquid markets
    minLiquidity: 10000  // in USD
};
// Create and start the bot
const bot = new MeanReversionBot(tokenConfig);
bot.start().catch(error => {
    console.log(red(bold('\nBot crashed:')));
    console.error(red(error));
});
