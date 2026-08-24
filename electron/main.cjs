const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { app, BrowserWindow, ipcMain } = require('electron');
const yfModule = require('yahoo-finance2');

// מנגנון חילוץ בטוח של המחלקה מתוך CJS
const YahooFinanceClass =
  yfModule.YahooFinance ||
  (yfModule.default && yfModule.default.YahooFinance) ||
  yfModule.default;

const yahooFinance = typeof YahooFinanceClass === 'function'
  ? new YahooFinanceClass()
  : yfModule.default || yfModule;

async function getStockQuote(symbol) {
  let cleanSymbol = symbol.trim().toUpperCase();

  if (cleanSymbol.includes('TASE')) {
    cleanSymbol = cleanSymbol.replace('TASE:', '').replace(':TASE', '') + '.TA';
  }

  if (cleanSymbol.endsWith('.TA')) {
    console.log(`מבקש נתונים מ-Yahoo Finance עבור: ${cleanSymbol}`);

    try {
      const quote = await yahooFinance.quote(cleanSymbol);

      const priceInILS = (quote.regularMarketPrice || 0) / 100;
      const previousCloseInILS = (quote.regularMarketPreviousClose || quote.regularMarketOpen || 0) / 100;

      const changePercent = previousCloseInILS > 0
        ? ((priceInILS - previousCloseInILS) / previousCloseInILS) * 100
        : (quote.regularMarketChangePercent || 0);

      return {
        symbol: cleanSymbol,
        name: quote.longName || quote.shortName || cleanSymbol,
        price: priceInILS,
        openPrice: previousCloseInILS,
        changePercent: changePercent,
        currency: 'ILS'
      };
    } catch (err) {
      console.error('Yahoo Finance Error:', err);
      throw new Error(`לא נמצאו נתונים ב-Yahoo Finance עבור ${cleanSymbol}`);
    }
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY לא נמצא בקובץ .env');
  }

  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(cleanSymbol)}&apikey=${apiKey}`;
  console.log(`מבקש נתונים מ-Twelve Data עבור: ${cleanSymbol}`);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(`Twelve Data error: ${data.message ?? 'Unknown error'}`);
  }

  const price = Number(data.close);
  const openPrice = Number(data.open);
  const changePercent = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0;

  return {
    symbol: data.symbol,
    name: data.name,
    price,
    openPrice,
    changePercent,
    currency: data.currency
  };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, '../dist/portfolio-app/browser/index.html');
    window.loadFile(indexPath).catch(() => {
      window.loadFile(path.join(__dirname, '../dist/portfolio-app/index.html'));
    });
  } else {
    window.loadURL('http://localhost:4200');
  }
}

async function getUsdIls() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY לא נמצא בקובץ .env');
  }

  const url = `https://api.twelvedata.com/exchange_rate?symbol=USD/ILS&apikey=${apiKey}`;
  console.log('מבקש שער USD/ILS');

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(`Twelve Data error ${data.code ?? response.status}: ${data.message ?? 'Unknown error'}`);
  }

  return Number(data.rate);
}

ipcMain.handle('market:get-stock', async (_, symbol) => {
  return getStockQuote(symbol);
});

ipcMain.handle('market:get-usd-ils', async () => {
  return getUsdIls();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
