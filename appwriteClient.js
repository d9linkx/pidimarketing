// /Users/mac/Desktop/pidimarketing/appwriteClient.js

import { Client, Account, Databases, Storage, ID, Query } from 'https://cdn.jsdelivr.net/npm/appwrite@14.0.1/+esm';

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
        ADMIN_WHITELIST: 'admin_whitelist'
    },
    BUCKETS: {
        PROOFS: 'proofs'
    }
};

client.setEndpoint(APPWRITE_CONFIG.ENDPOINT).setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client, ID, Query, Account, Databases, Storage, APPWRITE_CONFIG };