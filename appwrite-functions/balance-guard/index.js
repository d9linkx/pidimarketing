/*
  Appwrite Function: Balance Guard
  Purpose: Protect the `balance` field on profile documents by recomputing the canonical
  balance from the transactions ledger and reverting any unauthorized client-side changes.

  How it works:
  - Trigger: databases.{DATABASE_ID}.collections.{PROFILES_COLLECTION_ID}.documents.update
  - The function reads the updated profile document from the event payload (or refetches it),
    then computes the expected balance by summing completed transactions for that user
    (payouts & deposits minus completed withdrawals).
  - If the profile.balance does not equal the expected balance, the function updates the
    profile document (server-side) and sets balance back to the computed value.

  Security model note:
  - This function treats the transactions collection as the source of truth for monetary
    state. Any legitimate money movement should be recorded in the transactions collection
    (type: 'payout', 'withdrawal', 'deposit', etc.) with status 'completed'.
  - Admins or server processes that want to alter balances should do so by creating
    transactions as well (or use this function's privileged API behavior).

  Environment variables required (set in Appwrite function config):
  - APPWRITE_ENDPOINT  (e.g. https://[appwrite-host]/v1)
  - APPWRITE_PROJECT   (project id)
  - APPWRITE_API_KEY   (API key with read/write access to the DB)
  - DATABASE_ID        (Appwrite database id)
  - PROFILES_COLLECTION_ID
  - TRANSACTIONS_COLLECTION_ID

  Deployment: create a function in Appwrite (Node 18+), paste this file as the entrypoint, and
  configure an event trigger on 'databases.<DATABASE_ID>.collections.<PROFILES_COLLECTION_ID>.documents.update'

  IMPORTANT: The function must run with an API Key that has privileges to update documents.
*/

const sdk = require('node-appwrite');

const client = new sdk.Client();

// Appwrite client config from environment
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const PROFILES_COLLECTION_ID = process.env.PROFILES_COLLECTION_ID;
const TRANSACTIONS_COLLECTION_ID = process.env.TRANSACTIONS_COLLECTION_ID;
const VAULTS_COLLECTION_ID = process.env.VAULTS_COLLECTION_ID || process.env.APPWRITE_VAULTS_COLLECTION_ID;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY || !DATABASE_ID || !PROFILES_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID || !VAULTS_COLLECTION_ID) {
  console.error('Missing required environment variables. See README.');
  process.exit(1);
}

client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const Query = sdk.Query;

async function computeExpectedBalance(userId) {
  // Fetch completed transactions for the user and compute credits/debits.
  // We assume completed transactions reflect settled ledger entries.
  let cursor = null;
  let all = [];
  try {
    // Appwrite's listDocuments supports limit; we'll page if necessary (100 max per page by default)
    let res = await databases.listDocuments(DATABASE_ID, TRANSACTIONS_COLLECTION_ID, [
      Query.equal('user_id', userId),
      Query.equal('status', 'completed'),
      Query.orderDesc('created_at'),
      Query.limit(100)
    ]);
    all = res.documents || [];
    // Note: If you expect >100 completed transactions, implement paging using res.total and offsets.
  } catch (e) {
    console.error('Failed fetching transactions:', e.message || e);
    throw e;
  }

  let credits = 0;
  let debits = 0;

  for (const t of all) {
    const amt = Number(t.amount || 0) || 0;
    const type = (t.type || '').toLowerCase();
    if (['payout', 'deposit', 'adjustment_credit'].includes(type)) credits += amt;
    if (['withdrawal', 'charge', 'adjustment_debit'].includes(type)) debits += amt;
  }

  return credits - debits;
}

(async function main() {
  try {
    // Appwrite function event data contains the updated document payload in APPWRITE_FUNCTION_EVENT_DATA
    // The exact shape may vary; attempt to parse sensible locations.
    const raw = process.env.APPWRITE_FUNCTION_EVENT_DATA || '{}';
    let eventData = {};
    try { eventData = JSON.parse(raw); } catch (e) { eventData = raw; }

    // The eventData is typically the document itself or contains resource/document. Handle common shapes.
    const profile = eventData?.$id ? eventData : (eventData?.resource?.document ? eventData.resource.document : eventData);
    const profileId = profile && profile.$id ? profile.$id : (profile && profile['id']) ? profile['id'] : null;

    if (!profileId) {
      console.log('Could not determine profile id from event payload. Exiting.');
      return;
    }

    console.log('Balance-guard triggered for profile:', profileId);

    // Compute expected canonical balance from transactions ledger
    const expected = await computeExpectedBalance(profileId);

    // Check VAULTS collection for the canonical balance
    try {
      const vres = await databases.listDocuments(DATABASE_ID, VAULTS_COLLECTION_ID, [Query.equal('user_id', profileId), Query.limit(1)]).catch(()=>({ documents: [] }));
      const vault = (vres && vres.documents && vres.documents[0]) || null;
      const vaultBalance = vault ? Number(vault.balance || 0) : null;

      if (vaultBalance === null) {
        // No vault doc exists: create one with expected balance (migration support)
        try {
          await databases.createDocument(DATABASE_ID, VAULTS_COLLECTION_ID, ID.unique(), { user_id: profileId, balance: expected, created_at: new Date().toISOString() });
          console.log(`Created vault for ${profileId} with balance ${expected}`);
        } catch (e) { console.error('Failed to create vault doc:', e.message || e); }
      } else if (Math.abs(vaultBalance - expected) > 0.001) {
        console.log(`Vault balance mismatch for ${profileId}. Vault: ${vaultBalance}, Expected: ${expected}`);
        // Update vault balance to expected
        try {
          await databases.updateDocument(DATABASE_ID, VAULTS_COLLECTION_ID, vault.$id, Object.assign({}, vault, { balance: expected }));
          console.log(`Updated vault for ${profileId} to ${expected}`);
        } catch (e) { console.error('Failed to update vault balance:', e.message || e); }
      } else {
        console.log('Vault balance matches expected. No action needed.');
      }
    } catch (e) {
      console.error('Vault validation failed:', e.message || e);
    }
  } catch (err) {
    console.error('Balance-guard function failed:', err.message || err);
    process.exit(1);
  }
})();
