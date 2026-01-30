/**
 * Code validation utilities
 *
 * Allowed characters: A-Z, 0-9, hyphen (-)
 * - Letters are automatically uppercased
 * - No spaces, special characters, or symbols allowed
 * - This prevents injection attacks and ensures URL-safe codes
 */

// Only allow alphanumeric and hyphens
const CODE_PATTERN = /^[A-Z0-9-]+$/;

// Min/max lengths
const MIN_CODE_LENGTH = 3;
const MAX_CODE_LENGTH = 32;

// Reserved codes that cannot be used
const RESERVED_CODES = new Set([
  'ADMIN',
  'API',
  'APP',
  'CREATE',
  'DELETE',
  'EDIT',
  'GROUP',
  'GROUPS',
  'HELP',
  'JOIN',
  'LOGIN',
  'LOGOUT',
  'NULL',
  'ROOT',
  'SETTINGS',
  'SYSTEM',
  'TEST',
  'UNDEFINED',
  'USER',
  'USERS',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validates and sanitizes a group code
 */
export function validateCode(code: string | undefined | null): ValidationResult {
  // Check for null/undefined
  if (code === null || code === undefined) {
    return { valid: false, error: 'Code is required' };
  }

  // Convert to string and trim
  const trimmed = String(code).trim();

  // Check for empty
  if (trimmed.length === 0) {
    return { valid: false, error: 'Code cannot be empty' };
  }

  // Uppercase for consistency
  const uppercased = trimmed.toUpperCase();

  // Check length
  if (uppercased.length < MIN_CODE_LENGTH) {
    return { valid: false, error: `Code must be at least ${MIN_CODE_LENGTH} characters` };
  }

  if (uppercased.length > MAX_CODE_LENGTH) {
    return { valid: false, error: `Code cannot exceed ${MAX_CODE_LENGTH} characters` };
  }

  // Check pattern (only alphanumeric and hyphens)
  if (!CODE_PATTERN.test(uppercased)) {
    return { valid: false, error: 'Code can only contain letters, numbers, and hyphens' };
  }

  // Check for reserved codes
  if (RESERVED_CODES.has(uppercased)) {
    return { valid: false, error: 'This code is reserved and cannot be used' };
  }

  // Check that code doesn't start or end with hyphen
  if (uppercased.startsWith('-') || uppercased.endsWith('-')) {
    return { valid: false, error: 'Code cannot start or end with a hyphen' };
  }

  // Check for consecutive hyphens
  if (uppercased.includes('--')) {
    return { valid: false, error: 'Code cannot contain consecutive hyphens' };
  }

  return { valid: true, sanitized: uppercased };
}

/**
 * Validates a device ID
 */
export function validateDeviceId(deviceId: string | undefined | null): ValidationResult {
  if (deviceId === null || deviceId === undefined) {
    return { valid: false, error: 'Device ID is required' };
  }

  const trimmed = String(deviceId).trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Device ID cannot be empty' };
  }

  // Device IDs should be UUIDs or similar - allow alphanumeric and hyphens
  if (trimmed.length > 128) {
    return { valid: false, error: 'Device ID is too long' };
  }

  // Only allow safe characters
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: 'Device ID contains invalid characters' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validates a display name
 */
export function validateDisplayName(name: string | undefined | null): ValidationResult {
  if (name === null || name === undefined) {
    return { valid: false, error: 'Display name is required' };
  }

  const trimmed = String(name).trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Display name cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Display name cannot exceed 50 characters' };
  }

  // Allow letters, numbers, spaces, and common punctuation
  // Disallow HTML/script characters
  if (/<|>|&|"|'|`|\\/.test(trimmed)) {
    return { valid: false, error: 'Display name contains invalid characters' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validates coordinates
 */
export function validateCoordinates(
  latitude: number | undefined | null,
  longitude: number | undefined | null
): ValidationResult {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return { valid: false, error: 'Coordinates are required' };
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: 'Coordinates cannot be NaN' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { valid: true };
}
