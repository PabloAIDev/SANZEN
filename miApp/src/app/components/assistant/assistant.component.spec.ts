import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { AssistantComponent } from './assistant.component';
import { AssistantService } from '../../services/assistant.service';
import { UserSessionService } from '../../services/user-session.service';

describe('AssistantComponent', () => {
  let fixture: ComponentFixture<AssistantComponent>;
  let component: AssistantComponent;
  let assistantServiceSpy: jasmine.SpyObj<AssistantService>;
  let sessionSubject: BehaviorSubject<{ id: number } | null>;

  beforeEach(async () => {
    assistantServiceSpy = jasmine.createSpyObj<AssistantService>('AssistantService', ['sendMessage']);
    assistantServiceSpy.sendMessage.and.resolveTo({
      message: 'Respuesta del asistente',
      actions: []
    });

    sessionSubject = new BehaviorSubject<{ id: number } | null>({ id: 1 });

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
});
