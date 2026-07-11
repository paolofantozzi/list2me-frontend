import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ThemeService } from './services/theme.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: ThemeService, useValue: { theme: () => 'default' } }],
    })
      // Template vuoto: evita di montare <tui-root> (e il suo albero di provider)
      // in un unit test che verifica solo la creazione del componente radice.
      .overrideComponent(App, { set: { template: '' } })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
