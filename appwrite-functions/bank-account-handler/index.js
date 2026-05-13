/*
  Appwrite Function: Bank Account Handler
  Purpose: Securely accept bank account details, encrypt the full account number,
  store ciphertext in a server-only collection, and update the user's profile with
  a masked account number (last4) and non-sensitive bank metadata.

  Usage:
  - Trigger: Called directly (via Appwrite Functions HTTP execution or as an SDK function execution).
  - Input (JSON): { user_id, bank_name, bank_account_holder, bank_account_number }

  Environment variables required:
  - APPWRITE_ENDPOINT
  - APPWRITE_PROJECT
  - APPWRITE_API_KEY   (service key with write access to DB)
  - DATABASE_ID
  - PROFILES_COLLECTION_ID
  - BANK_ACCOUNTS_SECURE_COLLECTION_ID
  - ENCRYPTION_KEY    (base64-encoded 32-byte key used for AES-256-GCM)

  Notes:
  - This function stores the encrypted payload in the secure collection and only
    writes a masked account number to the public `profiles` document.
  - Ensure the secure collection's document read permissions are restricted to
    server-side (service key) access only.
  - Deploy to Appwrite (Node 18+ runtime). Configure the env vars in the function settings.
*/

const sdk = require('node-appwrite');
const crypto = require('crypto');

const client = new sdk.Client();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const PROFILES_COLLECTION_ID = process.env.PROFILES_COLLECTION_ID;
const BANK_ACCOUNTS_SECURE_COLLECTION_ID = process.env.BANK_ACCOUNTS_SECURE_COLLECTION_ID;
const ENCRYPTION_KEY_B64 = process.env.ENCRYPTION_KEY;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY || !DATABASE_ID || !PROFILES_COLLECTION_ID || !BANK_ACCOUNTS_SECURE_COLLECTION_ID || !ENCRYPTION_KEY_B64) {
  console.error('Missing required environment variables. See README in appwrite-functions/bank-account-handler');
  process.exit(1);
}

client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const Query = sdk.Query;

function parseEventInput() {
  // Appwrite functions expose the function input in APPWRITE_FUNCTION_EVENT_DATA
  // and also provide STDIN for HTTP-style executions. Try both.
  let raw = process.env.APPWRITE_FUNCTION_EVENT_DATA || null;
  if (!raw) {
    try {
      raw = require('fs').readFileSync(0, 'utf8'); // STDIN
    } catch (e) { raw = null; }
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function decodeKey(b64) {
  try { return Buffer.from(b64, 'base64'); } catch (e) { return null; }
}

function aesGcmEncrypt(keyBuf, plaintext) {
  // keyBuf: Buffer(32)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv, { authTagLength: 16 });
  const ct = Buffer.concat([cipher.update(Buffer.from(String(plaintext), 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Return base64 JSON string with iv, tag and ciphertext
  return Buffer.from(JSON.stringify({ iv: iv.toString('base64'), tag: tag.toString('base64'), ct: ct.toString('base64') })).toString('base64');
}

function maskAccountNumber(acct) {
  if (!acct) return '';
  const s = String(acct).trim();
  return s.length > 4 ? '****' + s.slice(-4) : '****' + s;
}

(async function main() {
  try {
    const input = parseEventInput();
    const userId = input.user_id || input.userId || input.userId || null;
    const bankName = (input.bank_name || input.bankName || '') || '';
    const accountHolder = (input.bank_account_holder || input.account_holder || input.accountHolder) || '';
    const accountNumber = (input.bank_account_number || input.account_number || input.accountNumber) || null;

    if (!userId || !accountNumber) {
      console.error('Invalid input. Required: user_id and bank_account_number');
      console.error('Received input:', JSON.stringify(input));
      console.log(JSON.stringify({ success: false, error: 'missing_input' }));
      return;
    }

    const keyBuf = decodeKey(ENCRYPTION_KEY_B64);
    if (!keyBuf || keyBuf.length !== 32) {
      console.error('Invalid ENCRYPTION_KEY. Expect base64-encoded 32 byte key.');
      console.log(JSON.stringify({ success: false, error: 'invalid_key' }));
      return;
    }

    // Encrypt the full account number
    const encrypted = aesGcmEncrypt(keyBuf, accountNumber);

    // Persist encrypted payload into the secure collection
    const secureDoc = {
      user_id: userId,
      bank_name: bankName,
      bank_account_holder: accountHolder,
      account_number_encrypted: encrypted,
      account_number_masked: maskAccountNumber(accountNumber),
      created_at: new Date().toISOString()
    };

    // Create secure document (server-only collection)
    let createdSecure = null;
    try {
      createdSecure = await databases.createDocument(DATABASE_ID, BANK_ACCOUNTS_SECURE_COLLECTION_ID, sdk.ID.unique(), secureDoc);
      console.log('Stored encrypted bank payload for', userId);
    } catch (e) {
      console.error('Failed to create secure bank doc:', e.message || e);
      console.log(JSON.stringify({ success: false, error: 'store_failed' }));
      return;
    }

    // Update the user's profile document with masked last4 and non-sensitive metadata
    try {
      const profileUpdates = {
        bank_name: bankName || undefined,
        bank_account_holder: accountHolder || undefined,
        bank_account_number: maskAccountNumber(accountNumber),
        bank_account_number_masked: maskAccountNumber(accountNumber),
        bank_secure_ref: createdSecure.$id
      };

      // Fetch existing profile if it exists to preserve other fields
      const existing = await databases.getDocument(DATABASE_ID, PROFILES_COLLECTION_ID, userId).catch(() => null);
      if (existing && existing.$id) {
        await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION_ID, userId, Object.assign({}, existing, profileUpdates));
      } else {
        // Create a new profile doc with the userId as document id
        const toCreate = Object.assign({ full_name: '', created_at: new Date().toISOString(), $id: userId }, profileUpdates);
        // Note: createDocument third param is documentId; Appwrite may reject creation with a custom id if it already exists; we used getDocument above.
        await databases.createDocument(DATABASE_ID, PROFILES_COLLECTION_ID, userId, toCreate);
      }
    } catch (e) {
      console.error('Failed to update profile with masked bank info:', e.message || e);
      console.log(JSON.stringify({ success: false, error: 'profile_update_failed' }));
      return;
    }

    console.log(JSON.stringify({ success: true, masked: maskAccountNumber(accountNumber), secure_id: createdSecure.$id }));
  } catch (err) {
    console.error('bank-account-handler failed:', err.message || err);
    console.log(JSON.stringify({ success: false, error: 'exception', message: err.message || String(err) }));
    process.exit(1);
  }
})();
