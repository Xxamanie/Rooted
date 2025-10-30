/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { geminiService } from './gemini.js';
import { openaiService } from './openai.js';
import { getState } from '../state.js';

/**
 * A dynamic dispatcher that routes AI calls to the currently selected provider.
 * This abstracts away the provider logic from the rest of the application.
 */
export const aiService = {
    async generateQuiz(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai' 
            ? openaiService.generateQuiz(...args) 
            : geminiService.generateQuiz(...args);
    },

    async generateLessonPlan(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai' 
            ? openaiService.generateLessonPlan(...args) 
            : geminiService.generateLessonPlan(...args);
    },

    async generateTimetable(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai' 
            ? openaiService.generateTimetable(...args) 
            : geminiService.generateTimetable(...args);
    },
    
    async generateSimpleText(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai' 
            ? openaiService.generateSimpleText(...args) 
            : geminiService.generateSimpleText(...args);
    },
    
    async startChat() {
        const { aiProvider } = getState();
        // The concept of a persistent "chat" object is specific to the Gemini SDK.
        // OpenAI's API is stateless, so we handle it differently.
        return aiProvider === 'openai' 
            ? openaiService.startChat() 
            : geminiService.startChat();
    },

    async generateExamQuestions(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai'
            ? openaiService.generateExamQuestions(...args)
            : geminiService.generateExamQuestions(...args);
    },

    async gradeEssay(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai'
            ? openaiService.gradeEssay(...args)
            : geminiService.gradeEssay(...args);
    },

    async gradeExamAnswers(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai'
            ? openaiService.gradeExamAnswers(...args)
            : geminiService.gradeExamAnswers(...args);
    },

    async generateDifferentiatedMaterials(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai'
            ? openaiService.generateDifferentiatedMaterials(...args)
            : geminiService.generateDifferentiatedMaterials(...args);
    },

    async generateProactiveMessage(...args) {
        const { aiProvider } = getState();
        return aiProvider === 'openai'
            ? openaiService.generateProactiveMessage(...args)
            : geminiService.generateProactiveMessage(...args);
    },
};
