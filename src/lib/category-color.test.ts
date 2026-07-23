import { describe, it, expect } from 'vitest';
import { colorFor, CATEGORY_COLOR } from './category-color';

describe('colorFor', () => {
  it('should return the correct color for known categories', () => {
    expect(colorFor('fjord')).toBe(CATEGORY_COLOR['fjord']);
    expect(colorFor('bakery')).toBe(CATEGORY_COLOR['bakery']);
    expect(colorFor('camper_camping')).toBe(CATEGORY_COLOR['camper_camping']);
  });

  it('should return the camper fallback color for unknown categories starting with "camper_"', () => {
    expect(colorFor('camper_unknown')).toBe('#a0522d');
    expect(colorFor('camper_something_else')).toBe('#a0522d');
  });

  it('should return the default fallback color for all other unknown categories', () => {
    expect(colorFor('unknown_category')).toBe('#2d5a3d');
    expect(colorFor('random')).toBe('#2d5a3d');
    expect(colorFor('camper')).toBe('#2d5a3d'); // Missing underscore
  });
});
