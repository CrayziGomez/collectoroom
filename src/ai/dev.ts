
import { config } from 'dotenv';
import { resolve } from 'path';

// Specify the path to the .env file in the project root
config({ path: resolve(process.cwd(), '.env') });


// Flows are imported here to be registered with Genkit
// We only import what is absolutely necessary for the dev server to start
// to avoid pulling in dependencies that might cause issues.
// For example, if a flow depends on a service that depends on a native module,
// it might be better to comment it out here during development if not actively working on it.
import '@/ai/flows/card-description-generator.ts';
import '@/ai/flows/collection-description-generator.ts';
import '@/ai/flows/site-content-manager.ts';
import '@/ai/flows/user-actions.ts';
