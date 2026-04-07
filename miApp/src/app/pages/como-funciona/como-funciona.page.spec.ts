import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ComoFuncionaPage } from './como-funciona.page';

describe('ComoFuncionaPage', () => {
  let component: ComoFuncionaPage;
  let fixture: ComponentFixture<ComoFuncionaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComoFuncionaPage, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ComoFuncionaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
