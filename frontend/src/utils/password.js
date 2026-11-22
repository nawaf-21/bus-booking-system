// same rules as checkPassword in the backend
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one letter', test: (p) => /[A-Za-z]/.test(p) },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) }
]

export const passwordIsValid = (p) => p.length <= 64 && PASSWORD_RULES.every(rule => rule.test(p))
