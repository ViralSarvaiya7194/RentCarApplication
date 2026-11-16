import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';

export type LanguageCode = 'en' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private api = inject(ApiService);

  currentLang = signal<LanguageCode>('en');
  isRtl = computed(() => this.currentLang() === 'ar');
  dictionary = signal<Record<string, string>>({});
  loading = signal<boolean>(false);

  // In-memory cache for loaded languages to provide instantaneous offline/switch
  private cache: Partial<Record<LanguageCode, Record<string, string>>> = {};

  constructor() {
    this.init();
  }

  init() {
    const saved = (localStorage.getItem('kidsdrive_language') as LanguageCode) || 'en';
    this.setLanguage(saved === 'ar' ? 'ar' : 'en');
  }

  setLanguage(lang: LanguageCode) {
    this.currentLang.set(lang);
    localStorage.setItem('kidsdrive_language', lang);

    // Apply HTML and Body Direction & Language
    const isRtl = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.body.dir = isRtl ? 'rtl' : 'ltr';
    
    if (isRtl) {
      document.documentElement.classList.add('font-arabic');
      document.body.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('font-arabic');
      document.body.classList.remove('font-arabic');
    }

    // Check in-memory cache first for instant switch
    if (this.cache[lang] && Object.keys(this.cache[lang]!).length > 0) {
      this.dictionary.set(this.cache[lang]!);
    }

    this.loadTranslations(lang);
  }

  toggleLanguage() {
    const nextLang: LanguageCode = this.currentLang() === 'en' ? 'ar' : 'en';
    this.setLanguage(nextLang);
  }

  loadTranslations(lang: LanguageCode) {
    this.loading.set(true);
    this.api.getTranslationDictionary(lang).subscribe({
      next: (dict) => {
        if (dict && Object.keys(dict).length > 0) {
          this.cache[lang] = dict;
          // Only update if current language matches the returned response
          if (this.currentLang() === lang) {
            this.dictionary.set(dict);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.warn(`[TranslateService] Could not fetch translations for '${lang}' from server:`, err);
        this.loading.set(false);
      }
    });
  }

  reloadCurrent() {
    // Invalidate cache for current language and reload
    const lang = this.currentLang();
    delete this.cache[lang];
    this.loadTranslations(lang);
  }

  translate(key: string, params?: Record<string, any>): string {
    if (!key) return '';

    const dict = this.dictionary();
    let text = dict[key];

    // Missing translation handling / fallback
    if (text === undefined || text === null) {
      // Check if fallback exists in English cache
      if (this.cache['en'] && this.cache['en']![key]) {
        text = this.cache['en']![key];
      } else {
        // Human-readable fallback from key (e.g. 'COMMON.SAVE' -> 'Save')
        const parts = key.split('.');
        const lastPart = parts[parts.length - 1];
        text = lastPart
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // Parameter interpolation: {paramName} or {{paramName}}
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{+${k}\\}+`, 'g'), String(v ?? ''));
      }
    }

    return text;
  }

  // Short alias
  t(key: string, params?: Record<string, any>): string {
    return this.translate(key, params);
  }
}
