import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PermissionService } from './permission.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TranslatePipe],
  template: `
<ng-container *ngIf="isLogin()">
  <router-outlet></router-outlet>
</ng-container>

<ng-container *ngIf="!isLogin()">
<div class="flex h-full w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
  <!-- Sidebar -->
  <aside 
    [ngClass]="isSidebarCollapsed() ? 'w-16 py-4' : 'w-56 py-6'" 
    class="bg-slate-900 flex flex-col border-r border-slate-700 shrink-0 overflow-y-auto transition-[width] duration-200">
    
    <div class="mb-6 flex items-center justify-between" [ngClass]="isSidebarCollapsed() ? 'px-3 justify-center' : 'px-5 gap-3'">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md shadow-indigo-500/30" [title]="'Kiddie Kruzzer'">K</div>
        <div *ngIf="!isSidebarCollapsed()" class="truncate min-w-0">
          <span class="text-white font-bold tracking-wider text-sm block truncate">Kiddie Kruzzer</span>
          <span class="text-[9px] text-indigo-400 font-semibold block uppercase truncate">Automated POS</span>
        </div>
      </div>
      <button 
        type="button" 
        *ngIf="!isSidebarCollapsed()" 
        (click)="toggleSidebar()" 
        class="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
        title="Collapse sidebar">
        <svg class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
      </button>
    </div>
    
    <div *ngIf="!isSidebarCollapsed()" class="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'NAV.MAIN' | translate }}</div>
    <div *ngIf="isSidebarCollapsed()" class="h-px bg-slate-800 my-2 mx-3"></div>
    <nav class="flex flex-col gap-1 px-2 sm:px-3 mb-6 text-sm text-slate-400">
      <a *ngIf="perm.can('POS', 'VIEW')" routerLink="/" routerLinkActive="text-indigo-400 bg-slate-800" [routerLinkActiveOptions]="{exact: true}" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.POS' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.POS' | translate }}</span>
      </a>
      <a *ngIf="perm.can('BILLS_DUPLICATE', 'VIEW') || perm.can('BILLS_CANCEL', 'VIEW')" routerLink="/bills" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.BILLS' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.BILLS' | translate }}</span>
      </a>
      <!-- Reports & Business Intelligence Section (Individual Page-Wise Links) -->
      <div *ngIf="hasAnyReportAccess()" class="flex flex-col">
        <!-- If collapsed, clicking icon routes to /reports -->
        <a *ngIf="isSidebarCollapsed()" 
           routerLink="/reports" 
           routerLinkActive="text-indigo-400 bg-slate-800"
           class="flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-slate-400"
           [title]="'NAV.REPORTS' | translate">
          <svg class="w-4 h-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        </a>

        <!-- When expanded, show collapsible Reports header and list of authorized report pages -->
        <div *ngIf="!isSidebarCollapsed()" 
             (click)="toggleReportsMenu($event)"
             class="flex items-center justify-between px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-slate-400"
             [title]="'NAV.REPORTS' | translate">
          <div class="flex items-center gap-3 min-w-0">
            <svg class="w-4 h-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span class="truncate font-semibold">{{ 'NAV.REPORTS' | translate }}</span>
          </div>
          <svg [class.rotate-180]="reportsMenuExpanded()" class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>

        <!-- Submenu of Individual Authorized Report Pages -->
        <div *ngIf="!isSidebarCollapsed() && reportsMenuExpanded()" class="flex flex-col gap-0.5 ps-5 pe-1 py-1 border-s border-indigo-900/40 ms-4 mt-0.5 animate-in fade-in duration-150">
          <ng-container *ngFor="let item of reportNavItems">
            <a *ngIf="perm.can(item.module, 'VIEW')" 
               [routerLink]="['/reports', item.slug]" 
               routerLinkActive="text-indigo-400 bg-slate-800/80 font-bold" 
               class="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition truncate"
               [title]="item.label">
              <span class="text-xs shrink-0">{{ item.icon }}</span>
              <span class="truncate">{{ item.label }}</span>
            </a>
          </ng-container>
        </div>
      </div>
    </nav>

    <div *ngIf="!isSidebarCollapsed()" class="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'NAV.MASTERS' | translate }}</div>
    <div *ngIf="isSidebarCollapsed()" class="h-px bg-slate-800 my-2 mx-3"></div>
    <nav class="flex flex-col gap-1 px-2 sm:px-3 mb-6 text-sm text-slate-400">
      <a *ngIf="perm.can('COMPANY', 'VIEW')" routerLink="/company" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.COMPANY' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m-5 4h.01"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.COMPANY' | translate }}</span>
      </a>
      <a *ngIf="perm.can('BRANCH', 'VIEW')" routerLink="/branch" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.BRANCH' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.BRANCH' | translate }}</span>
      </a>
      <a *ngIf="perm.can('LOCATION', 'VIEW')" routerLink="/location" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.LOCATION' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.LOCATION' | translate }}</span>
      </a>
      <a *ngIf="perm.can('USER', 'VIEW')" routerLink="/user" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.USER_MASTER' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.USER_MASTER' | translate }}</span>
      </a>
      <a *ngIf="perm.can('USER_RIGHTS', 'VIEW')" routerLink="/user-rights" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.USER_RIGHTS' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.USER_RIGHTS' | translate }}</span>
      </a>
      <a *ngIf="perm.can('PRINTER_MASTER', 'VIEW')" routerLink="/printer-master" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.PRINTER_MASTER' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.PRINTER_MASTER' | translate }}</span>
      </a>
      <a *ngIf="perm.can('PRINT_FORMAT_MASTER', 'VIEW')" routerLink="/print-format-master" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.PRINT_FORMAT_MASTER' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.PRINT_FORMAT_MASTER' | translate }}</span>
      </a>
    </nav>

    <div *ngIf="!isSidebarCollapsed()" class="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'NAV.OPERATIONS' | translate }}</div>
    <div *ngIf="isSidebarCollapsed()" class="h-px bg-slate-800 my-2 mx-3"></div>
    <nav class="flex flex-col gap-1 px-2 sm:px-3 mb-6 text-sm text-slate-400">
      <a *ngIf="perm.can('CAR_MODEL', 'VIEW')" routerLink="/car-model" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.CAR_MODEL' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.CAR_MODEL' | translate }}</span>
      </a>
      <a *ngIf="perm.can('CAR', 'VIEW')" routerLink="/car" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.CAR_NUMBER' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.CAR_NUMBER' | translate }}</span>
      </a>
      <a *ngIf="perm.can('RATE', 'VIEW')" routerLink="/rate" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.RATE_SETUP' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.RATE_SETUP' | translate }}</span>
      </a>
      <a *ngIf="perm.can('GRACE_PERIOD', 'VIEW')" routerLink="/grace-period" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.GRACE_PERIOD' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.GRACE_PERIOD' | translate }}</span>
      </a>
    </nav>

    <div *ngIf="!isSidebarCollapsed()" class="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'NAV.ADMINISTRATION' | translate }}</div>
    <div *ngIf="isSidebarCollapsed()" class="h-px bg-slate-800 my-2 mx-3"></div>
    <nav class="flex flex-col gap-1 px-2 sm:px-3 mb-6 text-sm text-slate-400">
      <a *ngIf="perm.can('MASTER_EXPORT', 'VIEW')" routerLink="/master-export" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.MASTER_EXPORT' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.MASTER_EXPORT' | translate }}</span>
      </a>
      <a *ngIf="perm.can('TRANSLATIONS', 'VIEW')" routerLink="/translations" routerLinkActive="text-indigo-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.TRANSLATIONS' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.TRANSLATIONS' | translate }}</span>
      </a>
    </nav>

    <div *ngIf="!isSidebarCollapsed()" class="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-auto">{{ 'NAV.CLOSING' | translate }}</div>
    <div *ngIf="isSidebarCollapsed()" class="h-px bg-slate-800 my-2 mx-3 mt-auto"></div>
    <nav class="flex flex-col gap-1 px-2 sm:px-3 pb-4 text-sm text-slate-400">
      <a *ngIf="perm.can('PERIODIC_REPORT', 'VIEW')" routerLink="/periodic-report" routerLinkActive="text-amber-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.PERIODIC_REPORT' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.PERIODIC_REPORT' | translate }}</span>
      </a>
      <a *ngIf="perm.can('SHIFT_CLOSE', 'VIEW')" routerLink="/shift-close" routerLinkActive="text-orange-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 transition-colors'"
         [title]="'NAV.SHIFT_CLOSING' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.SHIFT_CLOSING' | translate }}</span>
      </a>
      <a *ngIf="perm.can('DAY_CLOSE', 'VIEW')" routerLink="/day-close" routerLinkActive="text-red-400 bg-slate-800" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 text-red-400 transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 text-red-400 transition-colors'"
         [title]="'NAV.DAY_CLOSING' | translate">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'NAV.DAY_CLOSING' | translate }}</span>
      </a>
      <a (click)="logout()" 
         [class]="isSidebarCollapsed() ? 'flex items-center justify-center p-2.5 rounded-md hover:text-white hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors' : 'flex items-center gap-3 px-3 py-2 rounded-md hover:text-white hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors'"
         [title]="'AUTH.LOGOUT' | translate">
        <svg class="w-4 h-4 shrink-0 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        <span *ngIf="!isSidebarCollapsed()" class="truncate">{{ 'AUTH.LOGOUT' | translate }}</span>
      </a>
    </nav>

    <!-- Sidebar Expand Toggle when Collapsed -->
    <button 
      type="button" 
      *ngIf="isSidebarCollapsed()" 
      (click)="toggleSidebar()" 
      class="mx-auto mt-2 mb-2 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer"
      title="Expand sidebar">
      <svg class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
    </button>
  </aside>

  <!-- Main UI Container -->
  <main class="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
    <!-- Top Header Bar -->
    <header class="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shadow-xs z-10 shrink-0 gap-2">
      <!-- Left side: Toggle button + Company & Branch -->
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <button 
          type="button" 
          (click)="toggleSidebar()" 
          [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          class="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <div class="flex flex-col min-w-0">
          <h1 class="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2 min-w-0">
            <span class="truncate max-w-[140px] sm:max-w-[220px] md:max-w-xs lg:max-w-md" [title]="companyName()">{{ companyName() }}</span>
            <span class="text-[10px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 sm:px-2 py-0.5 rounded shrink-0 whitespace-nowrap">
              {{ 'HEADER.BRANCH' | translate:{name: branchName()} }}
            </span>
          </h1>
          <p class="text-[11px] sm:text-xs text-slate-400 truncate max-w-[200px] sm:max-w-[300px] md:max-w-md" [title]="locationName()">
            {{ 'HEADER.LOCATION' | translate:{name: locationName()} }}
          </p>
        </div>
      </div>

      <!-- Right side: Language, Sales Time, User Profile & Logout -->
      <div class="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
        <!-- Language Selector -->
        <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner shrink-0">
          <button 
            type="button"
            (click)="translateService.setLanguage('en')" 
            [class]="translateService.currentLang() === 'en' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
            class="px-2 sm:px-2.5 py-1 text-xs rounded-md transition flex items-center gap-1 cursor-pointer shrink-0">
            <span>🇺🇸</span>
            <span>EN</span>
          </button>
          <button 
            type="button"
            (click)="translateService.setLanguage('ar')" 
            [class]="translateService.currentLang() === 'ar' ? 'bg-white text-indigo-600 shadow-xs font-bold font-arabic' : 'text-slate-500 hover:text-slate-800 font-medium font-arabic'"
            class="px-2 sm:px-2.5 py-1 text-xs rounded-md transition flex items-center gap-1 cursor-pointer shrink-0">
            <span>🇸🇦</span>
            <span class="font-arabic">العربية</span>
          </button>
        </div>

        <!-- Sales Date & Time (Persistent Business Sales Date) -->
        <div class="text-right rtl:text-left border-s border-e border-slate-200 px-2 sm:px-3 shrink-0 hidden md:flex flex-col justify-center">
          <div class="flex items-center gap-1.5 justify-end rtl:justify-start">
            <span class="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-none whitespace-nowrap">{{ 'HEADER.SALES_DATE' | translate }}:</span>
            <span class="text-[11px] sm:text-xs font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded leading-none whitespace-nowrap">{{ salesDate() }}</span>
          </div>
          <p class="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap leading-none mt-1">{{ currentTime | date:'HH:mm:ss' }}</p>
        </div>

        <!-- User Profile & Quick Logout -->
        <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shadow-indigo-600/20 shrink-0">
            {{ userInitials() }}
          </div>
          <div class="flex flex-col min-w-0 max-w-[85px] sm:max-w-[120px] md:max-w-[160px]">
            <p class="text-xs font-bold text-slate-900 leading-tight truncate whitespace-nowrap" [title]="employeeName()">{{ employeeName() }}</p>
            <p class="text-[10px] text-green-600 font-bold uppercase flex items-center gap-1 whitespace-nowrap">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
              <span class="truncate">{{ userRole() }}</span>
            </p>
          </div>
          <button (click)="logout()" [title]="'AUTH.LOGOUT' | translate" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition shrink-0 cursor-pointer">
            <svg class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Workspace (Router Outlet) -->
    <div class="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden relative">
      <router-outlet></router-outlet>
    </div>

    <!-- Bottom Dashboard Snippet -->
    <footer class="h-9 sm:h-11 bg-slate-900 text-slate-400 px-3 sm:px-6 flex items-center justify-between text-xs shrink-0 border-t border-slate-800">
      <div class="flex gap-3 sm:gap-6 items-center shrink-0">
        <div class="flex gap-2 items-center">
          <span class="opacity-60 text-[10px] sm:text-[11px] font-bold whitespace-nowrap">{{ 'FOOTER.FLEET_OCCUPANCY' | translate }}</span>
          <span class="text-indigo-300 font-mono font-bold text-[11px] sm:text-xs">{{ occupancyRate() }}</span>
        </div>
      </div>
      <div class="flex gap-2 sm:gap-4 items-center text-[10px] sm:text-[11px] shrink-0">
        <span class="text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
          <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-ping"></span>
          {{ 'FOOTER.POSTGRES_CONNECTED' | translate }}
        </span>
        <span class="text-slate-700 hidden sm:inline">|</span>
        <a (click)="logout()" class="hover:text-white cursor-pointer transition-colors text-slate-400 whitespace-nowrap">{{ 'AUTH.LOGOUT' | translate }}</a>
        <span class="text-slate-700 hidden sm:inline">|</span>
        <span class="text-indigo-400 font-mono whitespace-nowrap">{{ 'FOOTER.VERSION' | translate }}</span>
      </div>
    </footer>
  </main>
</div>
</ng-container>
  `
})
export class App implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);

  isSidebarCollapsed = signal<boolean>(localStorage.getItem('kk_sidebar_collapsed') === 'true');

  currentTime = new Date();
  employeeName = signal('Employee');
  userName = signal('User');
  userRole = signal('STAFF');
  userInitials = signal('EM');
  companyName = signal('Your Events Management Company');
  branchName = signal('Kiddie Kruzzer');
  locationName = signal('Avenues Mall -Phase -4- Gate 25');
  revenueToday = signal('0.000');
  occupancyRate = signal('0%');
  salesDate = signal<string>(localStorage.getItem('salesDate') || '');

  reportsMenuExpanded = signal<boolean>(true);

  reportNavItems = [
    { slug: 'management-dashboard', module: 'REPORT_DASHBOARD', label: 'Management Dashboard', icon: '📊' },
    { slug: 'daily-summary', module: 'REPORT_DAILY_SUMMARY', label: 'Daily Sales Summary', icon: '📅' },
    { slug: 'periodic-report', module: 'REPORT_PERIODIC', label: 'Periodic Sales (Thermal)', icon: '🖨️' },
    { slug: 'shift-report', module: 'REPORT_SHIFT', label: 'Shift Sales Report', icon: '🕒' },
    { slug: 'location-sales', module: 'REPORT_LOCATION', label: 'Location-wise Sales', icon: '📍' },
    { slug: 'item-sales', module: 'REPORT_ITEM', label: 'Car Model & Item Sales', icon: '🏎️' },
    { slug: 'payment-collection', module: 'REPORT_PAYMENT', label: 'Payment Collections', icon: '💳' },
    { slug: 'aggregator-sales', module: 'REPORT_AGGREGATOR', label: 'Aggregator Sales', icon: '🌐' },
    { slug: 'discount-analysis', module: 'REPORT_DISCOUNT', label: 'Discount Analysis', icon: '🏷️' },
    { slug: 'cancellation-analysis', module: 'REPORT_CANCELLATION', label: 'Void Bills & Cancellations', icon: '❌' },
    { slug: 'cashier-performance', module: 'REPORT_CASHIER', label: 'Cashier Performance', icon: '👤' },
    { slug: 'customer-sales', module: 'REPORT_CUSTOMER', label: 'Customer-wise Sales', icon: '📱' },
  ];

  hasAnyReportAccess(): boolean {
    if (this.perm.isAdmin() || this.perm.can('REPORTS', 'VIEW')) return true;
    return this.reportNavItems.some(r => this.perm.can(r.module, 'VIEW'));
  }

  toggleReportsMenu(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.reportsMenuExpanded.update(v => !v);
  }

  toggleSidebar() {
    const next = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(next);
    localStorage.setItem('kk_sidebar_collapsed', String(next));
  }

  constructor() {
    setInterval(() => this.currentTime = new Date(), 1000);
    
    // Refresh user profile on any navigation event (e.g. after login)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.refreshUserProfile();
      this.loadSessionInfo();
    });

    if (!localStorage.getItem('isLoggedIn') && this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit() {
    this.refreshUserProfile();
    this.loadSessionInfo();
  }

  refreshUserProfile() {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        const empName = u.employeeName || u.employee_name || u.name || u.username || 'Employee';
        const uname = u.username || 'User';
        
        this.employeeName.set(empName);
        this.userName.set(uname);
        this.userRole.set(u.role || 'STAFF');
        
        const words = empName.trim().split(/\s+/);
        let inits = 'EM';
        if (words.length >= 2 && words[0] && words[1]) {
          inits = (words[0][0] + words[1][0]).toUpperCase();
        } else if (words.length === 1 && words[0].length >= 2) {
          inits = words[0].substring(0, 2).toUpperCase();
        } else if (words.length === 1 && words[0].length === 1) {
          inits = words[0].toUpperCase() + 'P';
        }
        this.userInitials.set(inits);
      } catch (e) {}
    }

    this.perm.refresh();

    const savedCompany = localStorage.getItem('currentCompany');
    if (savedCompany) this.companyName.set(savedCompany);

    const savedBranch = localStorage.getItem('currentBranch');
    if (savedBranch) this.branchName.set(savedBranch);

    const savedLoc = localStorage.getItem('currentLocation');
    if (savedLoc) this.locationName.set(savedLoc);
  }

  loadSessionInfo() {
    this.api.getSalesDate().subscribe({
      next: (res) => {
        if (res?.salesDate) {
          this.salesDate.set(res.salesDate);
          localStorage.setItem('salesDate', res.salesDate);
        }
      },
      error: () => {}
    });

    this.api.getSessionInfo().subscribe({
      next: (info) => {
        if (info) {
          if (info.company) this.companyName.set(info.company);
          if (info.branch) this.branchName.set(info.branch);
          if (info.location) this.locationName.set(info.location);
          if (info.revenueToday !== undefined) this.revenueToday.set(info.revenueToday);
          if (info.occupancy) this.occupancyRate.set(info.occupancy);
        }
      },
      error: () => {}
    });
  }

  isLogin() {
    return this.router.url === '/login';
  }

  logout() {
    const raw = localStorage.getItem('currentUser');
    let u: any = null;
    if (raw) { try { u = JSON.parse(raw); } catch(e) {} }

    this.api.logout({
      userId: u?.id,
      username: u?.username,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1'
    }).subscribe({
      next: () => {},
      error: () => {}
    });

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentCompany');
    localStorage.removeItem('currentBranch');
    localStorage.removeItem('currentLocation');
    localStorage.removeItem('currentShift');
    this.perm.refresh();
    this.router.navigate(['/login']);
  }
}
