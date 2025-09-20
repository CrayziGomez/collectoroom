'use server';

/**
 * @fileOverview An AI agent for generating card description suggestions.
 *
 * - generateCardDescription - A function that generates a card description.
 * - CardDescriptionInput - The input type for the generateCardDescription function.
 * - CardDescriptionOutput - The return type for the generateCardDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CardDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the card.'),
  category: z.string().describe('The category of the card.'),
  existingDescription: z.string().optional().describe('The existing description of the card, if any.'),
});
export type CardDescriptionInput = z.infer<typeof CardDescriptionInputSchema>;

const CardDescriptionOutputSchema = z.object({
  suggestedDescription: z.string().describe('The AI-generated suggested description for the card.'),
});
export type CardDescriptionOutput = z.infer<typeof CardDescriptionOutputSchema>;

export async function generateCardDescription(input: CardDescriptionInput): Promise<CardDescriptionOutput> {
  return generateCardDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cardDescriptionPrompt',
  input: {schema: CardDescriptionInputSchema},
  output: {schema: CardDescriptionOutputSchema},
  prompt: `You are an expert at writing engaging and informative descriptions for collectible cards.

  Given the following information about a card, generate a suggested description that is concise, appealing, and accurately reflects the card's content and significance.

  Category: {{{category}}}
  Title: {{{title}}}
  Existing Description (if any): {{{existingDescription}}}

  Suggested Description:`,
});

const generateCardDescriptionFlow = ai.defineFlow(
  {
    name: 'generateCardDescriptionFlow',
    inputSchema: CardDescriptionInputSchema,
    outputSchema: CardDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

