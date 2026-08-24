import { DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // מיובא עבור הטופס במידה ומשתמשים ב-ngModel
import { Position } from '../models/positions';
import { MarketDataService } from '../services/market-data.service';

const STORAGE_KEY = 'portfolio_positions';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss'
})
export class Portfolio implements OnInit {

  usdIls = 0;
  positions: Position[] = []; // ערך דיפולטיבי ריק

  loading = true;
  error = '';

  // משתנים לניהול המודאל של הוספת מניה
  isModalOpen = false;
  newSymbol = '';

  constructor(
    private readonly marketDataService: MarketDataService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadPositionsFromStorage();
    await this.loadMarketData();
  }

  // טעינת מניות מ-localStorage
  private loadPositionsFromStorage(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.positions = JSON.parse(saved);
      } catch (e) {
        console.error('שגיאה בטעינת נתונים מ-localStorage', e);
        this.positions = [];
      }
    } else {
      this.positions = []; // במידה ואין מידע שמור, המערך יישאר ריק
    }
  }

  // שמירת המניות הקישוריות ל-localStorage
  private savePositionsToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.positions));
  }

  async loadMarketData(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      this.usdIls = await this.marketDataService.getUsdIls();

      if (this.positions.length > 0) {
        await Promise.all(
          this.positions.map(async position => {
            const quote = await this.marketDataService.getStockQuote(
              position.symbol
            );

            position.name = quote.name;
            position.price = quote.price;
            position.openPrice = quote.openPrice;
            position.changePercent = quote.changePercent;
          })
        );
      }
    } catch (error) {
      console.error(error);
      this.error = 'לא הצלחנו לקבל את נתוני השוק';
    } finally {
      this.loading = false;
    }
  }

  // פונקציה להוספת מניה חדשה ושמירתה
 async addPosition(): Promise<void> {
  if (!this.newSymbol.trim()) return;

  // הפיכת התווים לאותיות גדולות
  let symbol = this.newSymbol.trim().toUpperCase();

  // המרה אוטומטית: אם המשתמש הקליד TASE:LUMI או LUMI:TASE -> נמיר ל-LUMI.TA
  if (symbol.includes('TASE')) {
    symbol = symbol.replace('TASE:', '').replace(':TASE', '') + '.TA';
  }

  const newPos: Position = {
    id: Date.now().toString(),
    symbol: symbol,
    name: symbol
  };

  // הוספה למערך ושמירה ב-Storage
  this.positions.push(newPos);
  this.savePositionsToStorage();

  this.closeAddModal();

  // *** קריטי: טעינה מחדש של נתוני השוק כדי להפעיל את ה-IPC ב-main.cjs ***
  await this.loadMarketData();
}
  removePosition(id: string): void {
    this.positions = this.positions.filter(
      position => position.id !== id
    );
    this.savePositionsToStorage(); // עדכון הזיכרון לאחר מחיקה
  }

  openAddModal(): void {
    this.isModalOpen = true;
  }

  closeAddModal(): void {
    this.isModalOpen = false;
    this.newSymbol = '';
  }

  get totalUsd(): number {
    return this.positions.reduce(
      (total, position) =>
        total + (position.price ?? 0),
      0
    );
  }

  get totalIls(): number {
    return this.totalUsd * this.usdIls;
  }
}
