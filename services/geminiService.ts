import { GoogleGenAI, Chat, GroundingChunk, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { GEMINI_PRO_PREVIEW, GEMINI_FLASH_PREVIEW, GEMINI_FLASH_LITE, GEMINI_2_5_FLASH } from "../constants";
import { GeolocationPosition } from "../types";

// Helper function for base64 decoding (as per guidelines)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper for decoding audio data (as per guidelines)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const createGoogleGenAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const sendSearchQuery = async (prompt: string): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = createGoogleGenAI();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_PREVIEW,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, groundingChunks };
  } catch (error) {
    console.error("Error in sendSearchQuery:", error);
    throw new Error(`Failed to get search results: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const sendMapsQuery = async (
  prompt: string,
  location?: GeolocationPosition
): Promise<{ text: string; groundingChunks: GroundingChunk[] }> => {
  const ai = createGoogleGenAI();
  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_2_5_FLASH,
      contents: prompt,
      config: config,
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, groundingChunks };
  } catch (error) {
    console.error("Error in sendMapsQuery:", error);
    throw new Error(`Failed to get map information: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const createChatSession = (): Chat => {
  const ai = createGoogleGenAI();
  return ai.chats.create({
    model: GEMINI_PRO_PREVIEW,
    config: {
      systemInstruction: "Você é um assistente de viagens inteligente e amigável, pronto para ajudar a planejar as férias perfeitas. Ofereça sugestões, informações e ajude a organizar itinerários. Responda em português.",
    },
  });
};

export const sendMessageToChatStream = async (
  chat: Chat,
  message: string,
  onNewText: (text: string) => void,
  onComplete: (groundingChunks?: GroundingChunk[]) => void,
  onError: (error: string) => void
) => {
  try {
    const streamResponse = await chat.sendMessageStream({ message: message });
    let fullText = '';
    let lastGroundingChunks: GroundingChunk[] | undefined;

    for await (const chunk of streamResponse) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        onNewText(fullText);
      }
      if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        lastGroundingChunks = c.candidates[0].groundingMetadata.groundingChunks;
      }
    }
    onComplete(lastGroundingChunks);
  } catch (error) {
    console.error("Error in sendMessageToChatStream:", error);
    onError(`Failed to get chat response: ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const sendFastResponse = async (prompt: string): Promise<string> => {
  const ai = createGoogleGenAI();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_LITE,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for lowest latency
      }
    });
    return response.text || "No response received.";
  } catch (error) {
    console.error("Error in sendFastResponse:", error);
    throw new Error(`Failed to get fast response: ${error instanceof Error ? error.message : String(error)}`);
  }
};