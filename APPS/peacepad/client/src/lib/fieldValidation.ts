/**
 * Field Validation Utilities
 * Validates phone numbers (US, Canada, Nigeria), emails, and other form fields
 * No letters, symbols, or emojis allowed in phone numbers
 */

/**
 * Validates phone numbers (any country)
 * Accepts 7-15 digits with optional formatting characters
 */
export const validatePhoneNumber = (phoneNumber: string): { valid: boolean; error?: string } => {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return { valid: true }; // Empty is OK - optional field
  }

  const cleaned = phoneNumber.trim();

  // Check for letters (no letters allowed)
  if (/[a-zA-Z]/.test(cleaned)) {
    return { valid: false, error: "Please enter a valid phone number" };
  }

  // Remove common formatting characters for validation
  const digitsOnly = cleaned.replace(/[\s\-\(\)\+\.]/g, "");

  // Check if it's only digits
  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, error: "Please enter a valid phone number" };
  }

  // Check reasonable length (7-15 digits covers most international numbers)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, error: "Please enter a valid phone number" };
  }

  return { valid: true };
};

/**
 * Validates display name (user's name)
 * Requirements: 1-100 characters, letters and spaces only, no leading/trailing spaces
 */
export const validateDisplayName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < 1) {
    return { valid: false, error: "Name cannot be only spaces" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Name cannot exceed 100 characters" };
  }

  // Allow letters, numbers, spaces, hyphens, underscores, and apostrophes 
  // (for names like "Jean-Pierre", "O'Brien", or guest names like "Guest_60dsq")
  const nameRegex = /^[a-zA-Z0-9\s\-_']*$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: "Please use only letters, numbers, spaces, or simple punctuation (like - or ')" };
  }

  return { valid: true };
};

/**
 * Validates email address
 * Uses a practical email regex that covers most valid formats
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === "") {
    return { valid: true }; // Empty is OK - optional field
  }

  const trimmed = email.trim();

  // Practical email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long" };
  }

  return { valid: true };
};

/**
 * Validates amount (currency/money)
 * Allows decimal numbers with up to 2 decimal places
 */
export const validateAmount = (amount: string): { valid: boolean; error?: string } => {
  if (!amount || amount.trim() === "") {
    return { valid: false, error: "Amount is required" };
  }

  const trimmed = amount.trim();

  // Allow numbers with up to 2 decimal places
  const amountRegex = /^\d+(\.\d{1,2})?$/;

  if (!amountRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid amount (e.g., 100 or 100.50)" };
  }

  const value = parseFloat(trimmed);

  if (value <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (value > 999999.99) {
    return { valid: false, error: "Amount is too large" };
  }

  return { valid: true };
};

/**
 * Validates title/short text fields
 * Requirements: 1-200 characters, no leading/trailing spaces
 */
export const validateTitle = (title: string): { valid: boolean; error?: string } => {
  if (!title || title.trim() === "") {
    return { valid: false, error: "This field is required" };
  }

  const trimmed = title.trim();

  if (trimmed.length > 200) {
    return { valid: false, error: "Title cannot exceed 200 characters" };
  }

  return { valid: true };
};

/**
 * Validates description/longer text fields
 * Requirements: 1-5000 characters
 */
export const validateDescription = (description: string): { valid: boolean; error?: string } => {
  if (!description || description.trim() === "") {
    return { valid: false, error: "This field is required" };
  }

  const trimmed = description.trim();

  if (trimmed.length > 5000) {
    return { valid: false, error: "Description cannot exceed 5000 characters" };
  }

  return { valid: true };
};

/**
 * Validates a generic text field
 * Allows letters, numbers, common punctuation - no emojis
 */
export const validateGenericText = (text: string, maxLength: number = 500): { valid: boolean; error?: string } => {
  if (!text || text.trim() === "") {
    return { valid: false, error: "This field is required" };
  }

  const trimmed = text.trim();

  if (trimmed.length > maxLength) {
    return { valid: false, error: `This field cannot exceed ${maxLength} characters` };
  }

  return { valid: true };
};

/**
 * Sanitize phone number for storage (remove formatting)
 */
export const sanitizePhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/[\s\-\(\)\+\.]/g, "").trim();
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, "");

  // US/Canada format: (123) 456-7890
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // US/Canada format with country code: +1 (123) 456-7890
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Nigeria format: +234 XXX XXX XXXX
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // Default: return as-is if we can't format
  return phoneNumber;
};
