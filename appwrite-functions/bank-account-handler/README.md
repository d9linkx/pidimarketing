Bank Account Handler (Appwrite Function)
=====================================

Purpose
-------
This Appwrite Function accepts bank account details, encrypts the full account number using AES-256-GCM, stores the ciphertext in a server-only collection, and updates the user's `profiles` document with masked last-4 digits and non-sensitive metadata.

When to use
-----------
- Use this function when you want to avoid storing raw account numbers client-side or in public DB documents.
- Call this function from your frontend (via function execution API) or from your backend with service credentials.

Environment variables
---------------------
Set the following environment variables in the Appwrite Function configuration:

- APPWRITE_ENDPOINT: Appwrite endpoint URL (e.g., https://appwrite.example.com/v1)
- APPWRITE_PROJECT: Appwrite project ID
- APPWRITE_API_KEY: Service API key with write access to the database
- DATABASE_ID: ID of the Appwrite database (pidi_tasks)
- PROFILES_COLLECTION_ID: ID of the `profiles` collection
- BANK_ACCOUNTS_SECURE_COLLECTION_ID: ID of the secure collection where encrypted payloads will be stored
- ENCRYPTION_KEY: Base64-encoded 32-byte key used for AES-256-GCM encryption

Permissions
-----------
- The secure collection (`BANK_ACCOUNTS_SECURE_COLLECTION_ID`) must be configured so its documents are readable only by server-side processes (service key) or admins. Do not expose read permission to client users.
- The function itself uses `APPWRITE_API_KEY` (service key) to perform writes.

Input
-----
JSON payload accepted by the function (HTTP body or function event data):

{
  "user_id": "user_abc",
  "bank_name": "Zenith Bank",
  "bank_account_holder": "Jane Doe",
  "bank_account_number": "0123456789"
}

Output
------
The function prints a JSON object to stdout with success/failure and the created secure document id on success. Example:

{ "success": true, "masked": "****6789", "secure_id": "..." }

Deployment
----------
1. Create a new Function in Appwrite (Node 18+ runtime).
2. Paste `index.js` as the entrypoint code.
3. Add the environment variables above in the Function settings.
4. Deploy and test by invoking the function with a JSON payload.

Security notes
--------------
- Ensure `ENCRYPTION_KEY` is stored only in the function env and not committed to code.
- Rotate the encryption key periodically and provide a migration plan for re-encrypting existing records.
- Optionally integrate with a KMS for key management.

Limitations
-----------
- This function stores encrypted blobs as base64-encoded JSON. Decryption must be implemented server-side using the same key and AES-256-GCM.
- The function assumes Appwrite SDK v9+ environment and Node 18+.
