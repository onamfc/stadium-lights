import { describe, it, expect } from 'vitest';
import {
  validateCode,
  validateDeviceId,
  validateDisplayName,
  validateCoordinates,
} from './validation';

describe('validateCode', () => {
  describe('valid codes', () => {
    it('should accept valid alphanumeric codes', () => {
      const result = validateCode('ABC123');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('ABC123');
    });

    it('should accept codes with hyphens', () => {
      const result = validateCode('MY-CODE-2024');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('MY-CODE-2024');
    });

    it('should uppercase the code', () => {
      const result = validateCode('mycode');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('MYCODE');
    });

    it('should trim whitespace', () => {
      const result = validateCode('  ABC123  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('ABC123');
    });

    it('should accept minimum length code', () => {
      const result = validateCode('ABC');
      expect(result.valid).toBe(true);
    });

    it('should accept maximum length code', () => {
      const result = validateCode('A'.repeat(32));
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid codes', () => {
    it('should reject null', () => {
      const result = validateCode(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code is required');
    });

    it('should reject undefined', () => {
      const result = validateCode(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code is required');
    });

    it('should reject empty string', () => {
      const result = validateCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code cannot be empty');
    });

    it('should reject code shorter than minimum', () => {
      const result = validateCode('AB');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject code longer than maximum', () => {
      const result = validateCode('A'.repeat(33));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should reject codes with special characters', () => {
      const result = validateCode('ABC@123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('letters, numbers, and hyphens');
    });

    it('should reject codes with spaces', () => {
      const result = validateCode('ABC 123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('letters, numbers, and hyphens');
    });

    it('should reject reserved codes', () => {
      const result = validateCode('ADMIN');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should reject code starting with hyphen', () => {
      const result = validateCode('-MYCODE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('start or end with');
    });

    it('should reject code ending with hyphen', () => {
      const result = validateCode('MYCODE-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('start or end with');
    });

    it('should reject consecutive hyphens', () => {
      const result = validateCode('MY--CODE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('consecutive hyphens');
    });
  });
});

describe('validateDeviceId', () => {
  describe('valid device IDs', () => {
    it('should accept UUID format', () => {
      const result = validateDeviceId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    it('should accept alphanumeric IDs', () => {
      const result = validateDeviceId('device123');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid device IDs', () => {
    it('should reject null', () => {
      const result = validateDeviceId(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Device ID is required');
    });

    it('should reject empty string', () => {
      const result = validateDeviceId('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Device ID cannot be empty');
    });

    it('should reject overly long IDs', () => {
      const result = validateDeviceId('a'.repeat(129));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject IDs with special characters', () => {
      const result = validateDeviceId('device@123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });
});

describe('validateDisplayName', () => {
  describe('valid display names', () => {
    it('should accept simple names', () => {
      const result = validateDisplayName('John');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('John');
    });

    it('should accept names with spaces', () => {
      const result = validateDisplayName('John Doe');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid display names', () => {
    it('should reject null', () => {
      const result = validateDisplayName(null);
      expect(result.valid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateDisplayName('');
      expect(result.valid).toBe(false);
    });

    it('should reject overly long names', () => {
      const result = validateDisplayName('a'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed 50');
    });

    it('should reject names with HTML tags', () => {
      const result = validateDisplayName('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject names with quotes', () => {
      const result = validateDisplayName('John"s');
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateCoordinates', () => {
  describe('valid coordinates', () => {
    it('should accept valid coordinates', () => {
      const result = validateCoordinates(40.7128, -74.006);
      expect(result.valid).toBe(true);
    });

    it('should accept edge values', () => {
      expect(validateCoordinates(90, 180).valid).toBe(true);
      expect(validateCoordinates(-90, -180).valid).toBe(true);
      expect(validateCoordinates(0, 0).valid).toBe(true);
    });
  });

  describe('invalid coordinates', () => {
    it('should reject null latitude', () => {
      const result = validateCoordinates(null, -74.006);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Coordinates are required');
    });

    it('should reject null longitude', () => {
      const result = validateCoordinates(40.7128, null);
      expect(result.valid).toBe(false);
    });

    it('should reject NaN values', () => {
      const result = validateCoordinates(NaN, -74.006);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('NaN');
    });

    it('should reject latitude out of range', () => {
      expect(validateCoordinates(91, 0).valid).toBe(false);
      expect(validateCoordinates(-91, 0).valid).toBe(false);
    });

    it('should reject longitude out of range', () => {
      expect(validateCoordinates(0, 181).valid).toBe(false);
      expect(validateCoordinates(0, -181).valid).toBe(false);
    });

    it('should reject non-number types', () => {
      const result = validateCoordinates('40.7128' as any, -74.006);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be numbers');
    });
  });
});
