/**
 * What the prototype starts with: a filled Study Guide, the installed
 * keyboards, the keyboards that can be added, and the languages' own names.
 */
import type { StudyRow } from '@/components/ArcatextViews';

export type StudyEntry = StudyRow & { id: number; language: string; wrote: string };

/** The Study Guide, preloaded: entries a learner would have built up. */
export const STUDY_SEED: StudyEntry[] = [
  { id: 1, entry: 'viaje', translations: 'trip, journey, voyage', sentence: '¡Lo sé, tenemos que planear otro viaje!', wrote: 'I know, we have to plan another trip!', tag: 'Noun', misses: 3, language: 'Spanish' },
  { id: 2, entry: 'playa', translations: 'beach, shore', sentence: '¿Vamos a la playa el sábado?', wrote: 'Are we going to the beach on Saturday?', tag: 'Noun', misses: 2, language: 'Spanish' },
  { id: 3, entry: 'tenemos que', translations: 'we have to, we need to', sentence: 'Tenemos que salir temprano.', wrote: 'We have to leave early.', tag: 'Phrase', misses: 2, language: 'Spanish' },
  { id: 4, entry: '旅行', translations: 'trip, travel', sentence: 'また旅行の計画を立てないとね！', wrote: 'We have to plan another trip!', tag: 'Noun', misses: 1, language: 'Japanese' },
  { id: 5, entry: 'planear', translations: 'to plan, to glide', sentence: 'Hay que planear las vacaciones.', wrote: 'We need to plan the vacation.', tag: 'Verb', misses: 1, language: 'Spanish' },
  { id: 6, entry: '¡Qué bien!', translations: 'How nice!, Great!', sentence: '¡Qué bien que vienes!', wrote: "How great that you're coming!", tag: 'Phrase', misses: 1, language: 'Spanish' },
  { id: 7, entry: 'otra vez', translations: 'again, once more', sentence: '¿Lo hacemos otra vez?', wrote: 'Shall we do it again?', tag: 'Adverb', misses: 2, language: 'Spanish' },
  { id: 8, entry: '計画', translations: 'plan, project', sentence: '週末の計画は？', wrote: "What's the plan for the weekend?", tag: 'Noun', misses: 1, language: 'Japanese' },
];

export type Locale = { id: string; name: string };

/** Installed keyboards: the system one first, then those added. */
export const INITIAL_LOCALES: Locale[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Spanish' },
];

/** KeyboardLocaleData.swift: the locales that can be added (Apple's names). */
export const ADDABLE_LOCALES: Locale[] = [
  'Catalan', 'Czech', 'Danish', 'Dutch', 'English', 'Filipino', 'French', 'German', 'Hungarian', 'Indonesian',
  'Italian', 'Malay', 'Norwegian Bokmål', 'Polish', 'Portuguese', 'Romanian', 'Slovak', 'Spanish', 'Swedish', 'Turkish',
].map((name) => ({ id: name.toLowerCase().replace(/[^a-z]/g, ''), name }));

/** Each language's name for itself, under its English name in the pickers
    (hidden when the two are the same). */
export const NATIVE: Record<string, string> = {
  English: 'English',
  Spanish: 'Español',
  French: 'Français',
  German: 'Deutsch',
  Italian: 'Italiano',
  Portuguese: 'Português',
  Japanese: '日本語',
  Mandarin: '中文',
  Korean: '한국어',
  Arabic: 'العربية',
  Russian: 'Русский',
  Hindi: 'हिन्दी',
};
