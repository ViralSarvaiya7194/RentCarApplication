import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
       <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-700/50">
          <div class="bg-indigo-600 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
             <!-- Language Switcher in Login Screen Top Corner -->
             <div class="absolute top-4 right-4 z-20 flex items-center bg-white/20 backdrop-blur-md p-0.5 rounded-lg border border-white/20">
                <button 
                  type="button"
                  (click)="translateService.setLanguage('en')" 
                  [class]="translateService.currentLang() === 'en' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-white/80 hover:text-white font-medium'"
                  class="px-2 py-0.5 text-[11px] rounded transition flex items-center gap-1 cursor-pointer">
                  <span>🇺🇸</span>
                  <span>EN</span>
                </button>
                <button 
                  type="button"
                  (click)="translateService.setLanguage('ar')" 
                  [class]="translateService.currentLang() === 'ar' ? 'bg-white text-indigo-600 shadow-sm font-bold font-arabic' : 'text-white/80 hover:text-white font-medium font-arabic'"
                  class="px-2 py-0.5 text-[11px] rounded transition flex items-center gap-1 cursor-pointer">
                  <span>🇸🇦</span>
                  <span>العربية</span>
                </button>
             </div>

             <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/30 rounded-full blur-xl"></div>
             <div class="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl font-black mb-3 shadow-inner">K</div>
             <h1 class="text-2xl font-bold tracking-wider">{{ 'AUTH.APP_TITLE' | translate }}</h1>
             <p class="text-indigo-200 text-xs mt-1 font-medium flex items-center gap-1.5">
               <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
               {{ 'AUTH.SUBTITLE' | translate }}
             </p>
          </div>

          <form (ngSubmit)="login()" class="p-8 flex flex-col gap-5">
             <div *ngIf="errorMessage()" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2">
               <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               {{ errorMessage() }}
             </div>

             <div class="flex flex-col gap-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase">{{ 'AUTH.USERNAME' | translate }}</label>
               <input 
                 type="text" 
                 name="username"
                 [(ngModel)]="username" 
                 required
                 [placeholder]="'AUTH.USERNAME_PLACEHOLDER' | translate" 
                 class="border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium bg-slate-50 focus:bg-white transition">
             </div>

             <div class="flex flex-col gap-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase">{{ 'AUTH.PASSWORD' | translate }}</label>
               <input 
                 type="password" 
                 name="password"
                 [(ngModel)]="password" 
                 required
                 [placeholder]="'AUTH.PASSWORD_PLACEHOLDER' | translate" 
                 class="border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium bg-slate-50 focus:bg-white transition">
             </div>

             <button 
               type="submit" 
               [disabled]="loading()"
               class="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-lg hover:bg-indigo-700 transition mt-2 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer">
               <span *ngIf="loading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
               {{ loading() ? ('AUTH.AUTHENTICATING' | translate) : ('AUTH.LOGIN_BUTTON' | translate) }}
             </button>

             <div class="text-center mt-2 border-t border-slate-100 pt-4" style="display:none">
               <p class="text-[11px] text-slate-400">{{ 'AUTH.DEFAULT_ACCOUNTS' | translate }}</p>
               <div class="flex flex-wrap justify-center gap-2 mt-2 text-[11px] font-mono text-slate-600">
                 <span class="bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition border border-slate-200" (click)="setCreds('ahmed.thabet', '123456')">ahmed.thabet</span>
                 <span class="bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition border border-slate-200" (click)="setCreds('mustafa.sabra', '123456')">mustafa.sabra</span>
                 <span class="bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition border border-slate-200" (click)="setCreds('yahia.zakariya', '123456')">yahia.zakariya (Supervisor)</span>
                 <span class="bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition border border-slate-200" (click)="setCreds('admin', 'admin123')">admin</span>
               </div>
             </div>
          </form>
       </div>
    </div>
  `
})
export class LoginComponent {
  private router = inject(Router);
  private api = inject(ApiService);
  public translateService = inject(TranslateService);
  private perm = inject(PermissionService);

  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  setCreds(u: string, p: string) {
    this.username = u;
    this.password = p;
    this.errorMessage.set(null);
  }

  login() {
    if (!this.username || !this.password) {
      this.errorMessage.set(this.translateService.translate('AUTH.ERR_REQUIRED'));
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.api.login({
      username: this.username,
      password: this.password,
      terminal: 'POS-Terminal-1'
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.user) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          if (res.company) localStorage.setItem('currentCompany', res.company);
          if (res.branch) localStorage.setItem('currentBranch', res.branch);
          if (res.location) localStorage.setItem('currentLocation', res.location);
          if (res.shift) localStorage.setItem('currentShift', JSON.stringify(res.shift));

          this.perm.refresh();
          this.router.navigate(['/']);
        } else {
          this.errorMessage.set(this.translateService.translate('AUTH.ERR_INVALID'));
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error || this.translateService.translate('AUTH.ERR_INVALID'));
      }
    });
  }
}
