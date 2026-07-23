import { describe, it, expect } from 'vitest';
import { distanceKm } from './category-color';

describe('distanceKm', () => {
  it('should return 0 for the exact same coordinates', () => {
    const point = { lat: 0, lng: 0 };
    expect(distanceKm(point, point)).toBe(0);

    const anotherPoint = { lat: 51.5074, lng: -0.1278 }; // London
    expect(distanceKm(anotherPoint, anotherPoint)).toBe(0);
  });

  it('should calculate distance between two known points accurately', () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };

    const distance = distanceKm(london, paris);
    // Distance between London and Paris is ~344 km
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(350);
  });

  it('should handle negative coordinates correctly', () => {
    const newYork = { lat: 40.7128, lng: -74.0060 };
    const sydney = { lat: -33.8688, lng: 151.2093 };

    const distance = distanceKm(newYork, sydney);
    // Distance between NY and Sydney is ~15990 km
    expect(distance).toBeGreaterThan(15900);
    expect(distance).toBeLessThan(16100);
  });

  it('should handle coordinate boundaries (equator and poles)', () => {
    const northPole = { lat: 90, lng: 0 };
    const southPole = { lat: -90, lng: 0 };

    const distance = distanceKm(northPole, southPole);
    // Distance between North Pole and South Pole is ~20015 km (half of earth's circumference)
    expect(distance).toBeGreaterThan(19900);
    expect(distance).toBeLessThan(20100);
  });

  it('should handle longitude wraparound properly', () => {
    const point1 = { lat: 0, lng: -179 };
    const point2 = { lat: 0, lng: 179 };

    // Distance between these two points on the equator should be ~2 degrees of longitude
    // 1 degree at equator is ~111 km, so distance should be ~222 km
    const distance = distanceKm(point1, point2);
    expect(distance).toBeGreaterThan(220);
    expect(distance).toBeLessThan(225);
  });
});
