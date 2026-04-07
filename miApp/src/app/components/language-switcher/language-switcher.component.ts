import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    TranslateModule
  ],
  template: `
    <ion-button
      fill="outline"
      class="language-switcher-button"
      [class.language-switcher-button-menu]="variant === 'menu'"
      [attr.aria-label]="ariaLabel"
      (click)="toggleLanguage()"
    >
      {{ nextLanguageLabel }}
    </ion-button>
  `,
  styles: [`
    .language-switcher-button {
      min-width: 52px;
      margin-inline-start: 6px;
      --border-radius: 14px;
      --padding-start: 10px;
      --padding-end: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .language-switcher-button.language-switcher-button-menu {
      margin-inline-start: 0;
      min-width: 58px;
      --border-radius: 12px;
      --padding-start: 12px;
      --padding-end: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSwitcherComponent {
  private readonly destroyRef = inject(DestroyRef);

  @Input() variant: 'header' | 'menu' = 'header';

  currentLanguage: AppLanguage = 'es';

  constructor(
    private languageService: LanguageService,
    private translateService: TranslateService
  ) {
    this.languageService.currentLanguage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.currentLanguage = language;
      });
  }

  get nextLanguageLabel(): string {
    return this.languageService.getOppositeLanguage().toUpperCase();
  }

  get ariaLabel(): string {
    const nextLanguageName = this.translateService.instant(
      `COMMON.LANGUAGE_NAME.${this.languageService.getOppositeLanguage()}`
    );
    return this.translateService.instant('COMMON.LANGUAGE_SWITCH_ARIA', {
      language: nextLanguageName
    });
  }

  async toggleLanguage(): Promise<void> {
    await this.languageService.toggleLanguage();
  }
}
