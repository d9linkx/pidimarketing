// /Users/mac/Desktop/pidimarketing/appwriteClient.js

import { Client, Account, Databases, Storage, ID, Query, Functions } from 'https://cdn.jsdelivr.net/npm/appwrite@14.0.1/+esm';

const client = new Client();

const APPWRITE_CONFIG = {
    ENDPOINT: 'https://nyc.cloud.appwrite.io/v1',
    PROJECT_ID: '69fdc475002a4730d4ce',
    DATABASE_ID: 'pidi_tasks',
    COLLECTIONS: {
        PROFILES: 'profiles',
        CAMPAIGNS: 'campaigns',
        TRANSACTIONS: 'transactions',
        ENGAGEMENTS: 'engagements',
        VAULTS: 'vaults',
        WITHDRAWALS: 'withdrawals',
        ADMIN_WHITELIST: 'admin_whitelist'
    },
    BUCKETS: {
        PROOFS: 'proofs'
    }
};

// Placeholder for function IDs — replace with your deployed function IDs in Appwrite console
APPWRITE_CONFIG.FUNCTIONS = {
    BANK_ACCOUNT_HANDLER_ID: 'bank-account-handler'
};

client.setEndpoint(APPWRITE_CONFIG.ENDPOINT).setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export { client, ID, Query, Account, Databases, Storage, Functions, APPWRITE_CONFIG };