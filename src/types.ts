export type Language = 'fr' | 'en';

export type BrandName =
  | 'ESSENTIEL'
  | 'COLLECTIONS NATURE'
  | 'ARTIST(E)'
  | 'BLUSH CARE'
  | 'SOLARIS'
  | 'APHOGEE'
  | 'CARMEN RITUEL';

export type ImageKey = 'essentiel' | 'nature' | 'artiste' | 'blond' | 'aphogee' | 'atelier';

export type RoutineStep = 'cleanse' | 'treat' | 'leave-in' | 'style';

export interface EugeneProduct {
  id: string;
  brand: BrandName;
  range: string;
  imageKey: ImageKey;
  priceEur: number;
  volume: string;
  step: RoutineStep;
  stepLabelFr: string;
  stepLabelEn: string;
  nameFr: string;
  nameEn: string;
  taglineFr: string;
  taglineEn: string;
  benefitsFr: string[];
  benefitsEn: string[];
  howToUseFr: string;
  howToUseEn: string;
  concerns: string[];
  url: string;
}

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  summaryPoints?: string[];
  routineTitle?: string;
  products?: EugeneProduct[];
  timestamp: string;
  source: 'voice' | 'text';
}

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error';
