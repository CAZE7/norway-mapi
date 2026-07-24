import { describe, it, expect } from 'vitest';
import { normalize } from './places';

describe('normalize', () => {
  it('converts to lowercase', () => {
    expect(normalize('HELLO')).toBe('hello');
  });

  it('replaces Norwegian characters correctly', () => {
    expect(normalize('æble')).toBe('aeble');
    expect(normalize('ÆBLE')).toBe('aeble');
    expect(normalize('københavn')).toBe('koebenhavn');
    expect(normalize('KØBENHAVN')).toBe('koebenhavn');
    expect(normalize('ålesund')).toBe('aalesund');
    expect(normalize('ÅLESUND')).toBe('aalesund');
  });

  it('replaces German umlauts and eszett correctly', () => {
    expect(normalize('münchen')).toBe('muenchen');
    expect(normalize('MÜNCHEN')).toBe('muenchen');
    expect(normalize('köln')).toBe('koeln');
    expect(normalize('KÖLN')).toBe('koeln');
    expect(normalize('bär')).toBe('baer');
    expect(normalize('BÄR')).toBe('baer');
    expect(normalize('straße')).toBe('strasse');
    expect(normalize('STRAßE')).toBe('strasse');
  });

  it('removes diacritics via NFD normalization', () => {
    expect(normalize('café')).toBe('cafe');
    expect(normalize('CAFÉ')).toBe('cafe');
    expect(normalize('façade')).toBe('facade');
    expect(normalize('niño')).toBe('nino');
    expect(normalize('château')).toBe('chateau');
  });

  it('trims whitespace', () => {
    expect(normalize('  hello world  ')).toBe('hello world');
    expect(normalize('\t test \n')).toBe('test');
  });

  it('handles combinations of transformations', () => {
    expect(normalize('  Blåbær-Café  ')).toBe('blaabaer-cafe');
    expect(normalize('Münchener Straße')).toBe('muenchener strasse');
  });
});
