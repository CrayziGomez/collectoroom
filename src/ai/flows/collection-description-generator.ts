'use server';

/**
 * @fileOverview Generates AI-powered suggestions for collection descriptions.
 *
 * - generateCollectionDescription - A function that generates a collection description.
 * - CollectionDescriptionInput - The input type for the generateCollectionDescription function.
 * - CollectionDescriptionOutput - The return type for the generateCollectionDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CollectionDescriptionInputSchema = z.object({
  collectionName: z.string().describe('The name of the collection.'),
  keywords: z
    .string()
    .describe(
      'Keywords related to the collection, comma separated. Example: coins, ancient, roman'
    ),
});
export type CollectionDescriptionInput = z.infer<
  typeof CollectionDescriptionInputSchema
>;

const CollectionDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe('A suggested description for the collection.'),
});
export type CollectionDescriptionOutput = z.infer<
  typeof CollectionDescriptionOutputSchema
>;

export async function generateCollectionDescription(
  input: CollectionDescriptionInput
): Promise<CollectionDescriptionOutput> {
  return collectionDescriptionGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'collectionDescriptionGeneratorPrompt',
  input: {schema: CollectionDescriptionInputSchema},
  output: {schema: CollectionDescriptionOutputSchema},
  prompt: `You are an expert collection description writer.

  Given the collection name and keywords, generate a compelling description for the collection.

  Collection Name: {{{collectionName}}}
  Keywords: {{{keywords}}}

  Description:`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const collectionDescriptionGeneratorFlow = ai.defineFlow(
  {
    name: 'collectionDescriptionGeneratorFlow',
    inputSchema: CollectionDescriptionInputSchema,
    outputSchema: CollectionDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
