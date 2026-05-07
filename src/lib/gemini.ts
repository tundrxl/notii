import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WeakPoint {
  point: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FlashcardData {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export const geminiService = {
  async analyzeNote(title: string, content: string): Promise<WeakPoint[]> {
    const prompt = `You are an expert academic coach. Analyze the following student note and identify "weak points" where the information is incomplete, logically flawed, or poorly structured for learning.
    
    Note Title: ${title}
    Note Content: ${content}
    
    Return a JSON array of weak points.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              point: { type: Type.STRING, description: "Description of the problematic area." },
              suggestion: { type: Type.STRING, description: "Concrete advice to improve the note." },
              severity: { type: Type.STRING, enum: ["low", "medium", "high"], description: "Urgency of the improvement." }
            },
            required: ["point", "suggestion", "severity"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse Gemini analysis", e);
      return [];
    }
  },

  async generateFlashcards(title: string, content: string): Promise<FlashcardData[]> {
    const prompt = `Generate a set of high-quality flashcards for active recall based on the student's note content. Focus on key concepts, definitions, and causal relationships.
    
    Note Title: ${title}
    Note Content: ${content}
    
    Return a JSON array of flashcards with 'front' and 'back' fields.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: "The question or concept." },
              back: { type: Type.STRING, description: "The answer or explanation." }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  },

  async generateQuiz(title: string, content: string): Promise<QuizQuestion[]> {
    const prompt = `Create a challenging multiple-choice test based on these notes to ensure the student has truly mastered the material. Each question should have 4 options.
    
    Note Title: ${title}
    Note Content: ${content}
    
    Return a JSON array of questions with 'question', 'options' (array of 4 strings), and 'correctAnswer' (one of the options).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  }
};
