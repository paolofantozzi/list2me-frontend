import { TestBed } from '@angular/core/testing';
import { NbIconLibraries } from '@nebular/theme';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  // Il costruttore di App estende il pack "eva" con icone SVG custom: serve uno
  // stub di NbIconLibraries perché nel TestBed il pack eva non è registrato
  // (in app reale lo registra NbEvaIconsModule in app.config.ts).
  const iconLibraries = {
    getPack: vi.fn().mockReturnValue({ icons: new Map<string, string>() }),
    registerSvgPack: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: NbIconLibraries, useValue: iconLibraries }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('registra le icone SVG custom nel pack eva', () => {
    TestBed.createComponent(App);
    expect(iconLibraries.registerSvgPack).toHaveBeenCalledWith(
      'eva',
      expect.objectContaining({
        'dice-outline': expect.any(String),
        'vinyl-outline': expect.any(String),
        'letter-a-outline': expect.any(String),
      })
    );
  });
});
