import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedQuestion {
  type: 'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  questionText: string;
  options: string[];
  correctAnswers: string[];
  marks: number;
}

export const generateQuestionsFromAI = async (
  topic: string,
  difficulty: 'EASY' | 'MEDIUM' | 'HARD',
  type: 'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER',
  count: number = 3
): Promise<GeneratedQuestion[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key is not configured in the backend environment.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert educational assessment generator.
    Generate exactly ${count} quiz questions about the topic: "${topic}".
    
    The questions must follow these requirements:
    1. Difficulty level: "${difficulty}".
    2. Question type: "${type}".
    3. Output must be a valid JSON array of question objects.
    4. Each question object must strictly adhere to the following schema:
       {
         "type": "${type}",
         "difficulty": "${difficulty}",
         "tags": ["tag1", "tag2", ...], // 1-3 relevant tags in lowercase
         "questionText": "The question text, clear and concise",
         "options": ["Option A", "Option B", "Option C", "Option D"], // Must have exactly 4 realistic, distinct options for MCQ type questions. For SHORT_ANSWER, leave this as an empty array [].
         "correctAnswers": ["index_or_text"], 
           // For SINGLE_MCQ: exactly one element containing the index string of the correct answer, e.g. ["0"] or ["2"].
           // For MULTI_MCQ: one or more elements containing the index strings of correct answers, e.g. ["1", "3"].
           // For SHORT_ANSWER: one or more lowercase acceptable exact-match answers, e.g. ["javascript", "js"].
         "marks": ${difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 3}
       }

    Return ONLY a raw JSON array. Do not include markdown code block formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse response
    const questions: GeneratedQuestion[] = JSON.parse(responseText);
    
    if (!Array.isArray(questions)) {
      throw new Error('Gemini did not return an array of questions');
    }
    
    return questions;
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    throw new Error(error.message || 'Failed to generate questions using AI');
  }
};
