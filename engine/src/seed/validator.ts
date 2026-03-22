export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEntity(entity: {
  id: string;
  name: string;
  type: string;
  lat?: string | null;
  lng?: string | null;
}): ValidationResult {
  const errors: string[] = [];

  if (!entity.id || !entity.id.includes(':')) {
    errors.push(`Invalid record ID: ${entity.id}`);
  }

  if (!entity.name?.trim()) {
    errors.push('Missing name');
  }

  if (!entity.type) {
    errors.push('Missing type');
  }

  if (entity.lat !== undefined && entity.lat !== null) {
    const lat = parseFloat(entity.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`Invalid lat: ${entity.lat}`);
    }
  }

  if (entity.lng !== undefined && entity.lng !== null) {
    const lng = parseFloat(entity.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(`Invalid lng: ${entity.lng}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
