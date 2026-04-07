import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom, ReplaySubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'es' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly storageKey = 'sanzen-language';
  private readonly supportedLanguages: AppLanguage[] = ['es', 'en'];
  private readonly currentLanguageSubject = new ReplaySubject<AppLanguage>(1);

  readonly currentLanguage$ = this.currentLanguageSubject.asObservable();

  private currentLanguage: AppLanguage = 'es';

  constructor(
    private translateService: TranslateService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  async init(): Promise<void> {
    const initialLanguage = this.resolveInitialLanguage();

    this.translateService.addLangs(this.supportedLanguages);
    this.translateService.setDefaultLang('es');
    await this.applyLanguage(initialLanguage);
  }

  async setLanguage(language: AppLanguage): Promise<void> {
    if (!this.supportedLanguages.includes(language)) {
      return;
    }

    await this.applyLanguage(language);
  }

  async toggleLanguage(): Promise<void> {
    const nextLanguage: AppLanguage = this.currentLanguage === 'es' ? 'en' : 'es';
    await this.setLanguage(nextLanguage);
  }

  getCurrentLanguage(): AppLanguage {
    return this.currentLanguage;
  }

  getCurrentLocale(): string {
    return this.currentLanguage === 'en' ? 'en-GB' : 'es-ES';
  }

  getOppositeLanguage(): AppLanguage {
    return this.currentLanguage === 'es' ? 'en' : 'es';
  }

  private resolveInitialLanguage(): AppLanguage {
    const storedLanguage = this.readStoredLanguage();

    if (storedLanguage) {
      return storedLanguage;
    }

    if (typeof navigator !== 'undefined') {
      const browserLanguage = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
      return browserLanguage;
    }

    return 'es';
  }

  private readStoredLanguage(): AppLanguage | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const storedLanguage = localStorage.getItem(this.storageKey);
    return storedLanguage === 'es' || storedLanguage === 'en' ? storedLanguage : null;
  }

  private async applyLanguage(language: AppLanguage): Promise<void> {
    await firstValueFrom(this.translateService.use(language));
    this.currentLanguage = language;
    this.currentLanguageSubject.next(language);
    this.document.documentElement.lang = language;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, language);
    }
  }
}
