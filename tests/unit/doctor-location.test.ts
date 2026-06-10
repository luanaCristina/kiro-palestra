/**
 * Unit tests for Doctor Location feature (Google Maps integration)
 * Card: SDC-17
 * Spec: .kiro/specs/google-maps-clinic-location/requirements.md
 */

describe('Doctor Location - Validation', () => {
  // Requirement 1: Coordinate validation

  describe('Latitude validation', () => {
    it('should accept latitude = 0 (equator)', () => {
      expect(isValidLatitude(0)).toBe(true);
    });

    it('should accept latitude = 90 (North Pole)', () => {
      expect(isValidLatitude(90)).toBe(true);
    });

    it('should accept latitude = -90 (South Pole)', () => {
      expect(isValidLatitude(-90)).toBe(true);
    });

    it('should accept latitude = -8.0476 (Recife)', () => {
      expect(isValidLatitude(-8.0476)).toBe(true);
    });

    it('should reject latitude > 90', () => {
      expect(isValidLatitude(90.1)).toBe(false);
    });

    it('should reject latitude < -90', () => {
      expect(isValidLatitude(-90.1)).toBe(false);
    });

    it('should reject latitude = 91', () => {
      expect(isValidLatitude(91)).toBe(false);
    });
  });

  describe('Longitude validation', () => {
    it('should accept longitude = 0 (Greenwich)', () => {
      expect(isValidLongitude(0)).toBe(true);
    });

    it('should accept longitude = 180', () => {
      expect(isValidLongitude(180)).toBe(true);
    });

    it('should accept longitude = -180', () => {
      expect(isValidLongitude(-180)).toBe(true);
    });

    it('should accept longitude = -34.8770 (Recife)', () => {
      expect(isValidLongitude(-34.8770)).toBe(true);
    });

    it('should reject longitude > 180', () => {
      expect(isValidLongitude(180.1)).toBe(false);
    });

    it('should reject longitude < -180', () => {
      expect(isValidLongitude(-180.1)).toBe(false);
    });
  });

  describe('Location object validation', () => {
    it('should accept valid location with all fields', () => {
      const location = {
        address: 'Av. Agamenon Magalhães, 4775, Recife-PE',
        latitude: -8.0476,
        longitude: -34.8770,
      };
      expect(isValidLocation(location)).toBe(true);
    });

    it('should reject location without address', () => {
      const location = { address: '', latitude: -8.0476, longitude: -34.8770 };
      expect(isValidLocation(location)).toBe(false);
    });

    it('should reject location without latitude', () => {
      const location = { address: 'Rua X', latitude: null, longitude: -34.8770 };
      expect(isValidLocation(location)).toBe(false);
    });

    it('should reject location without longitude', () => {
      const location = { address: 'Rua X', latitude: -8.0476, longitude: null };
      expect(isValidLocation(location)).toBe(false);
    });

    it('should reject location with invalid coordinates', () => {
      const location = { address: 'Rua X', latitude: 999, longitude: -34.8770 };
      expect(isValidLocation(location)).toBe(false);
    });
  });
});

// ─── Helper functions (to be implemented in src/modules/location.ts) ────────

function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

function isValidLocation(location: { address: string | null; latitude: number | null; longitude: number | null }): boolean {
  if (!location.address || location.address.trim() === '') return false;
  if (location.latitude === null || location.longitude === null) return false;
  if (!isValidLatitude(location.latitude)) return false;
  if (!isValidLongitude(location.longitude)) return false;
  return true;
}
