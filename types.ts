import { FunctionCall, GroundingChunk } from "@google/genai";

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  isStreaming?: boolean;
  functionCalls?: FunctionCall[];
  groundingChunks?: GroundingChunk[];
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

export interface GroundedResult {
  text: string;
  groundingChunks: GroundingChunk[];
}

export type AppMode = 'chat' | 'search' | 'maps' | 'fast-response';
