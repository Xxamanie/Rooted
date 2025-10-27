/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState } from '../state.js';
import { geminiService } from './gemini.js';
import { openaiService } from './openai.js';

const getService = () => {
    const { aiProvider } = getState();
    return aiProvider === 'openai' ? openaiService : geminiService;
};

export const aiService = {
    generateQuiz(...args) {
        return getService().generateQuiz(...args);
    },
    generateLessonPlan(...args) {
        return getService().generateLessonPlan(...args);
    },
    generateTimetable(...args) {
        return getService().generateTimetable(...args);
    },
    generateSimpleText(...args) {
        return getService().generateSimpleText(...args);
    },
    startChat(...args) {
        return getService().startChat(...args);
    },
    generateExamQuestions(...args) {
        return getService().generateExamQuestions(...args);
    },
    gradeEssay(...args) {
        return getService().gradeEssay(...args);
    },
    gradeExamAnswers(...args) {
        return getService().gradeExamAnswers(...args);
    },
    generateDifferentiatedMaterials(...args) {
        return getService().generateDifferentiatedMaterials(...args);
    },
    generateProactiveMessage(...args) {
        return getService().generateProactiveMessage(...args);
    },
};
