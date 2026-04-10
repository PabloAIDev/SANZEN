import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AssistantService } from './services/assistant.service';
import { UserSessionService } from './services/user-session.service';

describe('AppComponent', () => {
  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AssistantService,
          useValue: {
            sendMessage: jasmine.createSpy('sendMessage').and.resolveTo({
              message: 'ok',
              actions: []
            })
          }
        },
        {
          provide: UserSessionService,
          useValue: {
            usuarioActual$: of(null),
            obtenerUsuarioIdActual: jasmine.createSpy('obtenerUsuarioIdActual').and.returnValue(null)
          }
        }
      ]
    }).compileComponents();
    
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
