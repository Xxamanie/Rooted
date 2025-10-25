/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { getState, setState } from '../state.js';
import { showToast } from "../ui/dom-utils.js";
import { showApiKeyModal } from "../ui/views/teacher-shell.js";

const getAiClient = () => {
    const { apiKey } = getState();
    if (!apiKey) {
        showToast("Please set your Gemini API Key in the settings.", "error");
        showApiKeyModal();
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const geminiService = {
    async generateQuiz(topic, numQuestions) {
        const ai = getAiClient();
        if (!ai) return null;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Generate a multiple-choice quiz with ${numQuestions} questions on the topic: "${topic}". For each question, provide 4 options and indicate the correct answer.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            quiz: {
                                type: Type.ARRAY,
                                description: `An array of ${numQuestions} quiz questions.`,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        answer: { type: Type.STRING }
                                    },
                                    required: ["question", "options", "answer"],
                                }
                            }
                        },
                        required: ["quiz"],
                    },
                },
            });
            return JSON.parse(response.text).quiz;
        } catch (error) {
            console.error("Error generating quiz:", error);
            showToast("AI Quiz generation failed. Please check your API key and try again.", "error");
            return null;
        }
    },

    async generateLessonPlan(topic, grade, weeks) {
        const ai = getAiClient();
        if (!ai) return null;

        const prompt = `Generate a ${weeks}-week lesson plan for the topic "${topic}" for ${grade}. Include learning objectives, a week-by-week breakdown of topics, suggested class activities or projects, and assessment methods.`;
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            plan: {
                                type: Type.OBJECT,
                                properties: {
                                    topic: { type: Type.STRING },
                                    gradeLevel: { type: Type.STRING },
                                    durationWeeks: { type: Type.NUMBER },
                                    learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    weeklyBreakdown: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                week: { type: Type.NUMBER },
                                                topic: { type: Type.STRING },
                                                activities: { type: Type.ARRAY, items: { type: Type.STRING } }
                                            },
                                            required: ["week", "topic", "activities"]
                                        }
                                    },
                                    assessmentMethods: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["topic", "gradeLevel", "durationWeeks", "learningObjectives", "weeklyBreakdown", "assessmentMethods"]
                            }
                        }
                    }
                }
            });
            return JSON.parse(response.text).plan;
        } catch (error) {
            console.error("Error generating lesson plan:", error);
            showToast("AI Lesson Plan generation failed. Please check your API key and try again.", "error");
            return null;
        }
    },

    async generateTimetable(classes, offLimits, teachersAndSubjects) {
        const ai = getAiClient();
        if (!ai) return null;

        const prompt = `
            You are an expert school scheduler. Create a 5-day (Monday-Friday) weekly timetable from 09:00 to 16:00, with 1-hour slots.
            
            **Constraints:**
            - Teachers and their subjects: ${teachersAndSubjects}
            - Classes to schedule: ${classes}
            - Off-limit times (no classes): ${offLimits || 'None'}
            - Ensure a teacher teaches only one class at a time.
            - Ensure a class is only taught one subject at a time.

            **Output Instructions:**
            - Format the output as a JSON object that adheres to the provided schema.
            - For each time slot, fill in the schedule for every day (Monday to Friday).
            - The schedule entry should be a string in the format: "Class Name - Subject (Teacher Name)".
            - If a time slot is off-limits or free, the entry should be the string "Break".
        `;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            scheduleByTime: {
                                type: Type.ARRAY,
                                description: "Array of time slots for the school day.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        time: { type: Type.STRING, description: "The time slot, e.g., '09:00 - 10:00'." },
                                        monday: { type: Type.STRING, description: "Class for Monday. Format: 'Class - Subject (Teacher)'. 'Break' if empty." },
                                        tuesday: { type: Type.STRING, description: "Class for Tuesday." },
                                        wednesday: { type: Type.STRING, description: "Class for Wednesday." },
                                        thursday: { type: Type.STRING, description: "Class for Thursday." },
                                        friday: { type: Type.STRING, description: "Class for Friday." }
                                    },
                                    required: ["time", "monday", "tuesday", "wednesday", "thursday", "friday"]
                                }
                            }
                        },
                        required: ["scheduleByTime"]
                    }
                }
            });
            return JSON.parse(response.text).scheduleByTime;
        } catch (error) {
            console.error("Error generating timetable:", error);
            showToast("AI Timetable generation failed. The model might be unable to find a valid schedule. Please check your constraints and API key.", "error");
            return null;
        }
    },
    
    async generateSimpleText(prompt) {
        const ai = getAiClient();
        if (!ai) return null;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            return response.text;
        } catch (error) {
            console.error("Error generating text:", error);
            showToast("An AI generation task failed. Please check your API key.", "error");
            return null;
        }
    },
    
    async startChat() {
        const ai = getAiClient();
        const state = getState();
        if (!ai) return null;
        
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: state.chatHistory.slice(0, -1),
             config: {
                systemInstruction: `You are a friendly and encouraging study buddy for a student. Your goal is to help them understand concepts, not just give them answers. Always guide them through problems step-by-step. The student's name is ${state.currentStudent?.name}. The student is in class ${state.currentStudent?.class}.`
            }
        });
        setState({ activeChat: chat });
        return chat;
    },

    async generateExamQuestions(topic, numQuestions) {
        const ai = getAiClient();
        if (!ai) return null;

        try {
             const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Generate a multiple-choice exam with ${numQuestions} questions on the topic: "${topic}". For each question, provide 4 options and indicate the correct answer.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            questions: {
                                type: Type.ARRAY,
                                description: `An array of ${numQuestions} multiple-choice exam questions.`,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        answer: { type: Type.STRING }
                                    },
                                    required: ["question", "options", "answer"],
                                }
                            }
                        },
                        required: ["questions"],
                    },
                },
            });
            return JSON.parse(response.text).questions;
        } catch (error) {
            console.error("Error creating examination:", error);
            showToast('Failed to generate exam questions. Please check your API key and try again.', 'error');
            return null;
        }
    },

    async gradeEssay(prompt, essay) {
        const ai = getAiClient();
        if (!ai) return null;

        const fullPrompt = `
            You are an AI teaching assistant. Grade the following student essay based on the provided prompt. 
            Provide constructive feedback covering clarity, relevance to the prompt, and grammar.
            Also, provide a suggested score out of 100.

            **Assignment Prompt:** ${prompt}
            **Student's Essay:** ${essay}
        `;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            feedback: { type: Type.STRING },
                            suggestedScore: { type: Type.NUMBER }
                        },
                        required: ["feedback", "suggestedScore"]
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (error) {
            console.error("AI grading error:", error);
            showToast("Failed to get AI feedback. Please check your API key.", "error");
            return null;
        }
    },

    async generateDifferentiatedMaterials(topic) {
        const ai = getAiClient();
        if (!ai) return null;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `For the topic "${topic}", generate differentiated learning materials for three student groups: "Support", "Core", and "Advanced". For each group, provide a brief description of the material's focus and a list of 2-3 specific activities or resources.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            materials: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        level: { type: Type.STRING, description: "e.g., Support, Core, Advanced" },
                                        focus: { type: Type.STRING },
                                        activities: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    },
                                    required: ["level", "focus", "activities"]
                                }
                            }
                        },
                        required: ["materials"]
                    }
                }
            });
            return JSON.parse(response.text).materials;
        } catch (error) {
             console.error("Error generating differentiated materials:", error);
             showToast("Failed to generate materials. Please check your API key.", "error");
             return null;
        }
    }
};
