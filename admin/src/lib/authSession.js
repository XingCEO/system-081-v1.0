const STORAGE_KEY = 'breakfast-admin-auth';

function readRawAuthRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readAuthSession() {
  const record = readRawAuthRecord();
  return record.state || {};
}

export function writeAuthSession(patch) {
  const record = readRawAuthRecord();
  const nextState = {
    ...(record.state || {}),
    ...patch
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...record,
    state: nextState,
    version: record.version ?? 0
  }));
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEY);
}
