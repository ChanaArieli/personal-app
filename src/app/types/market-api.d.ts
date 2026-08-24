interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  openPrice: number;
  changePercent: number;
}

interface MarketApi {
  getStock(symbol: string): Promise<StockQuote>;
  getUsdIls(): Promise<number>;
}

interface Window {
  marketApi: MarketApi;
}
