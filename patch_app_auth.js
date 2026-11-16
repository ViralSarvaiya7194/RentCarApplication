const fs = require('fs');
let content = fs.readFileSync('src/app/app.ts', 'utf8');

// Update logout link
content = content.replace(
  '<a routerLink="/login" class="hover:text-white cursor-pointer transition-colors text-slate-400">Logout</a>',
  '<a (click)="logout()" class="hover:text-white cursor-pointer transition-colors text-slate-400">Logout</a>'
);

// Update class
content = content.replace(
  `export class App {
  router = inject(Router);
  currentTime = new Date();
  constructor() {
    setInterval(() => this.currentTime = new Date(), 1000);
  }
  isLogin() {
    return this.router.url === '/login';
  }
}`,
  `export class App {
  router = inject(Router);
  currentTime = new Date();
  constructor() {
    setInterval(() => this.currentTime = new Date(), 1000);
    if (!localStorage.getItem('isLoggedIn') && this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }
  isLogin() {
    return this.router.url === '/login';
  }
  logout() {
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }
}`
);

fs.writeFileSync('src/app/app.ts', content);
