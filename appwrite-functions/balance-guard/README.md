Balance Guard - Appwrite Function

Purpose
-------
Protect the `balance` field on user profile documents. This function acts as a final, server-side guard: whenever a profile document is updated, it recomputes the canonical balance from the transactions collection and, if there's a mismatch, restores the correct balance.

When to trigger
----------------
Configure this function as a database trigger on document updates for the Profiles collection:

Event: databases.{DATABASE_ID}.collections.{PROFILES_COLLECTION_ID}.documents.update

Environment variables
---------------------
Set these in the Appwrite Function environment variables or secrets:

- APPWRITE_ENDPOINT - e.g. https://appwrite.example.com/v1
- APPWRITE_PROJECT - your Appwrite project id
- APPWRITE_API_KEY - API key with permissions to read/write the DB and collections
- DATABASE_ID - the database id where profiles and transactions live
- PROFILES_COLLECTION_ID - profiles collection id
- TRANSACTIONS_COLLECTION_ID - transactions collection id
 - VAULTS_COLLECTION_ID - vaults collection id (canonical financial state)

Why this is important
---------------------
- Frontend code can be tampered with. Never trust client-supplied balance values.
- The transactions collection is the canonical ledger. This function reconstructs balance from completed transactions.
 - The transactions collection is the canonical ledger. This function reconstructs balance from completed transactions and enforces the VAULTS collection as the canonical financial state.
 - If a malicious client tries to set `vault.balance` or `profile.balance` directly, the function detects the mismatch and reverts/updates the vault to the computed expected state.

How it works (high level)
-------------------------
1. Appwrite triggers this function on profile document updates.
2. The function reads the updated profile id from the event payload.
3. It queries the transactions collection for completed transactions belonging to that user.
4. Computes expected_balance = credits - debits.
5. If the user's VAULTS document is missing it will be created with expected_balance; if a vault's balance !== expected_balance, the function updates the VAULTS document with expected_balance.

Notes & recommendations
-----------------------
- For large transaction histories, implement pagination when listing transactions.
- Optionally create an audit log document when an unauthorized change is reverted.
- Ensure the function runs with an API key that is not exposed to clients.
- Prefer using Appwrite's server-side SDK to perform payouts and escrow releases; these operations should write to the transactions collection first, and the balance-guard will happily see the canonical change.

Deploy
------
1. Create a new Function in Appwrite, runtime: Node.js 18+.
2. Upload this repository or set this file as the function code (entrypoint `index.js`).
3. Set the environment variables listed above.
4. Add a trigger: database document update for the profiles collection.
5. Deploy and test by updating a profile document (expect the function logs to show detection and corrective action).

Example: Testing locally
------------------------
You can simulate an event by setting APPWRITE_FUNCTION_EVENT_DATA to a JSON string of the updated profile document and running the function locally (Node). Example:

APPWRITE_FUNCTION_EVENT_DATA='{"$id":"USER_ID","balance":99999}' node index.js

Remember to set other required environment variables before running locally.
