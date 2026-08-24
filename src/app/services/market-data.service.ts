import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {

  getStockQuote(symbol: string) {
    return window.marketApi.getStock(symbol);
  }

  getUsdIls() {
    return window.marketApi.getUsdIls();
  }
}
