export interface PasswordValidation {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function validateAdminPassword(password: string): PasswordValidation {
  const errors: string[] = []

  if (password.length < 12)
    errors.push('Minimum 12 caractères')
  if (!/[A-Z]/.test(password))
    errors.push('Au moins une majuscule')
  if (!/[a-z]/.test(password))
    errors.push('Au moins une minuscule')
  if (!/[0-9]/.test(password))
    errors.push('Au moins un chiffre')
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password))
    errors.push('Au moins un caractère spécial')

  // Common password patterns
  const commonPatterns = [
    /^(.)\1+$/,           // all same chars
    /^(012|123|234|345|456|567|678|789|890)/,
    /password/i,
    /admin/i,
    /codepromo/i,
  ]
  if (commonPatterns.some(p => p.test(password)))
    errors.push('Mot de passe trop prévisible')

  const strength: PasswordValidation['strength'] =
    errors.length === 0 && password.length >= 16 ? 'strong'
    : errors.length === 0 ? 'medium'
    : 'weak'

  return { valid: errors.length === 0, errors, strength }
}
