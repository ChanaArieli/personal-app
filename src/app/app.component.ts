import { Component } from '@angular/core';
import { Portfolio } from './portfolio/portfolio.component';

@Component({
  selector: 'app-root',
  imports: [Portfolio],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
