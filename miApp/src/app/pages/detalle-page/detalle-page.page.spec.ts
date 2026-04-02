import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { DetallePagePage } from './detalle-page.page';
import { PlatoService } from '../../services/plato.service';

describe('DetallePagePage', () => {
  let component: DetallePagePage;
  let fixture: ComponentFixture<DetallePagePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePagePage],
      providers: [
        {
          provide: Router,
          useValue: {
            events: of({}),
            navigateByUrl: jasmine.createSpy('navigateByUrl')
          }
        },
        {
          provide: PlatoService,
          useValue: {
            obtenerPlatoPorId: jasmine.createSpy('obtenerPlatoPorId').and.returnValue({
              id: 1,
              name: 'Plato test',
              price: 10,
              image: '',
              description: '',
              category: 'Principal',
              units: '350 g',
              ingredients: ['Arroz', 'Pollo'],
              calories: 400,
              allergens: [],
              healthScore: 80,
              nutrition: {
                macronutrients: {
                  protein_g: 15,
                  carbohydrates_g: 20,
                  fat_g: 10,
                  fiber_g: 4
                }
              }
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePagePage);
    fixture.componentRef.setInput('id', '1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
