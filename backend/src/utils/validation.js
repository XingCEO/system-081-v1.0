const HttpError = require('./HttpError');

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim();
}

function requireString(value, fieldName, options = {}) {
  const normalized = normalizeString(value);
  const { maxLength = 120, minLength = 1 } = options;

  if (!normalized || normalized.length < minLength) {
    throw new HttpError(400, `${fieldName}不可為空`);
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `${fieldName}長度不可超過 ${maxLength} 字`);
  }

  return normalized;
}

function optionalString(value, options = {}) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const { maxLength = 500 } = options;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `文字長度不可超過 ${maxLength} 字`);
  }

  return normalized;
}

function parsePositiveInteger(value, fieldName, options = {}) {
  const { min = 1, max = 999 } = options;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HttpError(400, `${fieldName}必須為 ${min} 到 ${max} 的整數`);
  }

  return parsed;
}

function parseNonNegativeInteger(value, fieldName, options = {}) {
  const { max = 999999 } = options;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
    throw new HttpError(400, `${fieldName}必須為 0 到 ${max} 的整數`);
  }

  return parsed;
}

function parseNonNegativeNumber(value, fieldName, options = {}) {
  const { max = 999999 } = options;
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
    throw new HttpError(400, `${fieldName}必須為 0 到 ${max} 的有效數值`);
  }

  return parsed;
}

function ensurePhone(value, options = {}) {
  const phone = normalizePhone(value);
  const { minLength = 8, maxLength = 15 } = options;

  if (phone.length < minLength || phone.length > maxLength) {
    throw new HttpError(400, '請輸入正確的電話格式');
  }

  return phone;
}

module.exports = {
  normalizeString,
  normalizePhone,
  requireString,
  optionalString,
  parsePositiveInteger,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  ensurePhone
};
