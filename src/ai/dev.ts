
import { config } from 'dotenv';
config();

// Flows are imported here to be registered with Genkit
import '@/ai/flows/card-description-generator.ts';
import '@/ai/flows/collection-description-generator.ts';
import '@/ai/flows/site-content-manager.ts';
import '@/ai/flows/user-actions.ts';
