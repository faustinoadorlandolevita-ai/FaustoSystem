
import { GoogleGenAI, Type } from "@google/genai";

export const getGeminiInsights = async (prompt: string, context: any) => {
  // Correctly initialize GoogleGenAI with the named parameter and direct process.env.API_KEY access.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });
    
    // The .text property is a getter, used here correctly.
    return {
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Failed to generate AI insights. Check your API key.", sources: [] };
  }
};

export const suggestServices = async (businessType: string) => {
  // Correctly initialize GoogleGenAI with the named parameter and direct process.env.API_KEY access.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a list of 5 common services for a ${businessType} business. Each service should have a name, estimated duration in minutes, and a description.`,
      config: {
        responseMimeType: "application/json",
        // Using responseSchema for a more robust JSON generation as recommended.
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'The name of the service.',
              },
              duration: {
                type: Type.NUMBER,
                description: 'Estimated duration in minutes.',
              },
              description: {
                type: Type.STRING,
                description: 'Brief description of the service.',
              },
              estimated_price: {
                type: Type.NUMBER,
                description: 'Suggested base price for the service.',
              }
            },
            required: ["name", "duration", "description", "estimated_price"],
          },
        },
      },
    });
    
    // Using .text getter to extract JSON string.
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};
