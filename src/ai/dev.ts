
import { config } from 'dotenv';
import { resolve } from 'path';

// Specify the path to the .env file in the project root
config({ path: resolve(process.cwd(), '.env') });


// Flows are imported here to be registered with Genkit
import '@/ai/flows/card-description-generator.ts';
import '@/ai/flows/collection-description-generator.ts';
import '@/ai/flows/site-content-manager.ts';
import '@/ai/flows/user-actions.ts';
