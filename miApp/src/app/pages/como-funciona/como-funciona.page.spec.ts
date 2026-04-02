import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComoFuncionaPage } from './como-funciona.page';

describe('ComoFuncionaPage', () => {
  let component: ComoFuncionaPage;
  let fixture: ComponentFixture<ComoFuncionaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ComoFuncionaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
