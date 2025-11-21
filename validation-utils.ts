// ===== VALIDATION UTILITIES FOR FRONTEND =====

import { VALIDATION_RULES, ValidationError } from './frontend-types';

// ===== VALIDATION FUNCTIONS =====

export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return VALIDATION_RULES.EMAIL.MESSAGE;
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters long`;
  }
  if (!VALIDATION_RULES.PASSWORD.PATTERN.test(password)) {
    return VALIDATION_RULES.PASSWORD.MESSAGE;
  }
  return null;
};

export const validateName = (name: string, fieldName: string = 'Name'): string | null => {
  if (!name) return `${fieldName} is required`;
  if (name.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return `${fieldName} must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters long`;
  }
  if (name.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return `${fieldName} cannot exceed ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`;
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Phone is optional
  if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
    return VALIDATION_RULES.PHONE.MESSAGE;
  }
  return null;
};

export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

// ===== FORM VALIDATION SCHEMAS =====

export const validateLoginForm = (data: { email: string; password: string }): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validateRequired(data.password, 'Password');
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  return errors;
};

export const validateRegisterForm = (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const firstNameError = validateName(data.firstName, 'First name');
  if (firstNameError) errors.push({ field: 'firstName', message: firstNameError });

  const lastNameError = validateName(data.lastName, 'Last name');
  if (lastNameError) errors.push({ field: 'lastName', message: lastNameError });

  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  if (data.confirmPassword !== undefined) {
    const passwordMatchError = validatePasswordMatch(data.password, data.confirmPassword);
    if (passwordMatchError) errors.push({ field: 'confirmPassword', message: passwordMatchError });
  }

  if (data.phone) {
    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.push({ field: 'phone', message: phoneError });
  }

  return errors;
};

export const validateChangePasswordForm = (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const currentPasswordError = validateRequired(data.currentPassword, 'Current password');
  if (currentPasswordError) errors.push({ field: 'currentPassword', message: currentPasswordError });

  const newPasswordError = validatePassword(data.newPassword);
  if (newPasswordError) errors.push({ field: 'newPassword', message: newPasswordError });

  const passwordMatchError = validatePasswordMatch(data.newPassword, data.confirmPassword);
  if (passwordMatchError) errors.push({ field: 'confirmPassword', message: passwordMatchError });

  return errors;
};

export const validateAddressForm = (data: {
  type: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!['home', 'work', 'other'].includes(data.type)) {
    errors.push({ field: 'type', message: 'Address type must be home, work, or other' });
  }

  const streetError = validateRequired(data.street, 'Street address');
  if (streetError) errors.push({ field: 'street', message: streetError });

  const cityError = validateRequired(data.city, 'City');
  if (cityError) errors.push({ field: 'city', message: cityError });

  const stateError = validateRequired(data.state, 'State');
  if (stateError) errors.push({ field: 'state', message: stateError });

  const zipCodeError = validateRequired(data.zipCode, 'Zip code');
  if (zipCodeError) errors.push({ field: 'zipCode', message: zipCodeError });

  const countryError = validateRequired(data.country, 'Country');
  if (countryError) errors.push({ field: 'country', message: countryError });

  return errors;
};

// ===== UTILITY FUNCTIONS =====

export const hasValidationErrors = (errors: ValidationError[]): boolean => {
  return errors.length > 0;
};

export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(err => err.field === fieldName);
  return error?.message;
};

export const formatValidationErrors = (errors: ValidationError[]): Record<string, string> => {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
};

// ===== REAL-TIME VALIDATION HOOK =====

export const useValidation = <T extends Record<string, any>>(
  validationSchema: (data: T) => ValidationError[]
) => {
  const validate = (data: T): { isValid: boolean; errors: ValidationError[] } => {
    const errors = validationSchema(data);
    return {
      isValid: !hasValidationErrors(errors),
      errors
    };
  };

  const validateField = (data: T, fieldName: keyof T): string | undefined => {
    const errors = validationSchema(data);
    return getFieldError(errors, fieldName as string);
  };

  return { validate, validateField };
};

// ===== PASSWORD STRENGTH CHECKER =====

export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^a-zA-Z\d]/.test(password)) {
    score += 1;
    feedback.unshift('Great! Special characters make it stronger');
  } else {
    feedback.push('Add special characters');
  }

  const isStrong = score >= 4;

  return { score, feedback, isStrong };
};
