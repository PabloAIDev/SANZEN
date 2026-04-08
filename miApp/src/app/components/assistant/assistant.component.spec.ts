import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AssistantComponent } from './assistant.component';
import { AssistantService } from '../../services/assistant.service';
import { UserSessionService } from '../../services/user-session.service';
import { LanguageService } from '../../services/language.service';

describe('AssistantComponent', () => {
  let fixture: ComponentFixture<AssistantComponent>;
  let component: AssistantComponent;
  let assistantServiceSpy: jasmine.SpyObj<AssistantService>;
  let sessionSubject: BehaviorSubject<{ id: number } | null>;
  let languageSubject: BehaviorSubject<'es' | 'en'>;

  beforeEach(async () => {
    assistantServiceSpy = jasmine.createSpyObj<AssistantService>('AssistantService', ['sendMessage']);
    assistantServiceSpy.sendMessage.and.resolveTo({
      message: 'Respuesta del asistente',
      actions: []
    });

    sessionSubject = new BehaviorSubject<{ id: number } | null>({ id: 1 });
    languageSubject = new BehaviorSubject<'es' | 'en'>('es');

    await TestBed.configureTestingModule({
      imports: [AssistantComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/menu',
            events: new Subject<NavigationEnd>(),
            navigateByUrl: jasmine.createSpy('navigateByUrl')
          }
        },
        {
          provide: AssistantService,
          useValue: assistantServiceSpy
        },
        {
          provide: UserSessionService,
          useValue: {
            usuarioActual$: sessionSubject.asObservable(),
            obtenerUsuarioIdActual: jasmine.createSpy('obtenerUsuarioIdActual').and.returnValue(1)
          }
        },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage$: languageSubject.asObservable()
          }
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string, params?: { screen?: string }) => {
              if (key === 'ASSISTANT.SEED_MESSAGE') {
                return 'Soy el asistente de SANZEN.';
              }

              if (key === 'ASSISTANT.CURRENT_SCREEN') {
                return `Pantalla actual: ${params?.screen ?? ''}`;
              }

              if (key === 'ASSISTANT.ERROR_FALLBACK') {
                return 'No he podido responder ahora mismo.';
              }

              return key;
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe sembrar un mensaje inicial del asistente al arrancar', () => {
    expect(component.mensajes.length).toBe(1);
    expect(component.mensajes[0].role).toBe('assistant');
    expect(component.mensajes[0].text).toContain('asistente de SANZEN');
  });

  it('debe enviar el historial corto al servicio antes del mensaje actual', async () => {
    component.mensajes = [
      { id: 'seed', role: 'assistant', text: 'Mensaje inicial' },
      { id: '1', role: 'user', text: 'Quiero opciones ligeras' },
      { id: '2', role: 'assistant', text: 'Te puedo recomendar varios platos.' }
    ];

    await component.enviarMensaje('Y sin gluten?');

    expect(assistantServiceSpy.sendMessage).toHaveBeenCalledWith('Y sin gluten?', 'menu', [
      { role: 'user', text: 'Quiero opciones ligeras' },
      { role: 'assistant', text: 'Te puedo recomendar varios platos.' }
    ]);
    expect(component.mensajes[component.mensajes.length - 1]?.text).toBe('Respuesta del asistente');
  });

  it('debe limpiar la conversacion al cambiar de usuario', () => {
    component.abierto = true;
    component.mensajeActual = 'texto pendiente';
    component.mensajes.push({ id: '3', role: 'user', text: 'Hola' });

    sessionSubject.next({ id: 2 });

    expect(component.abierto).toBeFalse();
    expect(component.mensajeActual).toBe('');
    expect(component.mensajes.length).toBe(1);
    expect(component.mensajes[0].role).toBe('assistant');
  });

  it('debe actualizar el mensaje inicial al cambiar de idioma si no hay conversacion activa', () => {
    languageSubject.next('en');

    expect(component.mensajes.length).toBe(1);
    expect(component.mensajes[0].role).toBe('assistant');
  });

  it('no debe navegar si la accion del asistente no es valida', async () => {
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    await component.ejecutarAccion({
      type: 'navigate',
      target: 'https://evil.example',
      label: 'Abrir'
    });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
