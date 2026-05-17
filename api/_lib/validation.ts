// Simple validation helper - no external dependencies
// For production, consider using Zod: https://zod.dev

type ValidationRule = {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'array' | 'object'
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

type Schema = Record<string, ValidationRule>

export function validate(data: any, schema: Schema): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  for (const [field, rules] of Object.entries(schema)) {
    const value = data?.[field]

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} es requerido`
      continue
    }

    // Skip validation if empty and not required
    if (value === undefined || value === null || value === '') continue

    // Type check
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors[field] = `${field} debe ser texto`
            continue
          }
          break
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors[field] = `${field} debe ser un número`
            continue
          }
          break
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors[field] = `${field} debe ser true/false`
            continue
          }
          break
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[field] = `${field} debe ser un email válido`
            continue
          }
          break
        case 'uuid':
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            errors[field] = `${field} debe ser un ID válido`
            continue
          }
          break
        case 'array':
          if (!Array.isArray(value)) {
            errors[field] = `${field} debe ser una lista`
            continue
          }
          break
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors[field] = `${field} debe ser un objeto`
            continue
          }
          break
      }
    }

    // String length checks
    if (typeof value === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        errors[field] = `${field} debe tener al menos ${rules.min} caracteres`
        continue
      }
      if (rules.max !== undefined && value.length > rules.max) {
        errors[field] = `${field} debe tener máximo ${rules.max} caracteres`
        continue
      }
    }

    // Array length checks
    if (Array.isArray(value)) {
      if (rules.min !== undefined && value.length < rules.min) {
        errors[field] = `${field} debe tener al menos ${rules.min} elementos`
        continue
      }
      if (rules.max !== undefined && value.length > rules.max) {
        errors[field] = `${field} debe tener máximo ${rules.max} elementos`
        continue
      }
    }

    // Pattern check
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors[field] = `${field} tiene un formato inválido`
      continue
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value)
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : `${field} es inválido`
        continue
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// Pre-built schemas for common operations
export const schemas = {
  login: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', min: 1 }
  },
  register: {
    name: { required: true, type: 'string', min: 2, max: 100 },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', min: 8, max: 100 }
  },
  chat: {
    message: { required: true, type: 'string', min: 1, max: 10000 },
    company_id: { type: 'string' }
  },
  businessAction: {
    action: { required: true, type: 'string', pattern: /^(create_lead|create_invoice|create_opportunity|create_payment)$/ },
    company_id: { required: true, type: 'string' }
  }
}