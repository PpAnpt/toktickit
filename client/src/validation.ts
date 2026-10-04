// Client-side mirrors of the server validation rules (server/src/utils/auth.ts).
// The server remains the authority; these give immediate feedback next to the field.

export const PASSWORD_RULE_TEXT = '8–72 characters, including at least one letter and one number';
export const PASSWORD_PLACEHOLDER = '8+ characters, letters and numbers';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function passwordPolicyError(password: string, label = 'Password'): string | null {
  if (password.length < 8) return `${label} must be at least 8 characters long.`;
  if (password.length > 72) return `${label} must be at most 72 characters long.`;
  if (password.trim() !== password) return `${label} must not start or end with spaces.`;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return `${label} must contain at least one letter and one number.`;
  }
  return null;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
