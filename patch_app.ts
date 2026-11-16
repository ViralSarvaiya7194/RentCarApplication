import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
<ng-container *ngIf="isLogin()">
  <router-outlet></router-outlet>
</ng-container>

<ng-container *ngIf="!isLogin()">
<div class="flex h-full w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
