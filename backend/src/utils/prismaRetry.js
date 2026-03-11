const { Prisma } = require('@prisma/client');

function isRetryablePrismaError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return message.includes('deadlock detected') || message.includes('could not serialize access');
}

async function wait(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withPrismaRetry(operation, options = {}) {
  const retries = Number(options.retries || 3);
  const baseDelayMs = Number(options.baseDelayMs || 50);

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryablePrismaError(error) || attempt === retries - 1) {
        throw error;
      }

      await wait(baseDelayMs * (attempt + 1));
    }
  }

  return operation();
}

module.exports = {
  isRetryablePrismaError,
  withPrismaRetry
};
