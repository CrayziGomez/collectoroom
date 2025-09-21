
import { config } from 'dotenv';
config();

import '@/app/(pages)/admin/firebase.ts';
import '@/ai/flows/card-description-generator.ts';
import '@/ai/flows/collection-description-generator.ts';
import '@/ai/flows/site-content-manager.ts';
import '@/ai/flows/user-actions.ts';
