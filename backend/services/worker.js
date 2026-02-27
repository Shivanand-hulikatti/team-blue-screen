const axios = require('axios');

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8000';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerProcessing({ documentId, projectId, fileUrl }) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(`${WORKER_URL}/process`, {
        documentId,
        projectId,
        fileUrl,
      });
      return response.data;
    } catch (err) {
      lastError = err;
      const isConnectionError =
        err.code === 'ECONNREFUSED' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        (err.response && err.response.status >= 500);
      if (isConnectionError && attempt < MAX_RETRIES) {
        console.warn(`Worker attempt ${attempt} failed (${err.code || err.message}), retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

module.exports = { triggerProcessing };
