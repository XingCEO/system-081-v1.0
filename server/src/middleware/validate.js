// 請求驗證 middleware

// 通用欄位驗證
const validate = (rules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.label || field} 為必填欄位`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rule.type === 'number' && isNaN(Number(value))) {
          errors.push(`${rule.label || field} 必須是數字`);
        }
        if (rule.type === 'number' && rule.min !== undefined && Number(value) < rule.min) {
          errors.push(`${rule.label || field} 不能小於 ${rule.min}`);
        }
        if (rule.type === 'string' && rule.minLength && String(value).length < rule.minLength) {
          errors.push(`${rule.label || field} 至少需要 ${rule.minLength} 個字元`);
        }
        if (rule.type === 'string' && rule.maxLength && String(value).length > rule.maxLength) {
          errors.push(`${rule.label || field} 不能超過 ${rule.maxLength} 個字元`);
        }
        if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`${rule.label || field} 的值無效`);
        }
        if (rule.pattern && !rule.pattern.test(String(value))) {
          errors.push(`${rule.label || field} 格式不正確`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '輸入資料驗證失敗',
        errors
      });
    }

    next();
  };
};

module.exports = { validate };
