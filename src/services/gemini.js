/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { getState, setState } from '../state.js';
import { showToast } from "../ui/dom-utils.js";

// As per guidelines, the API key is sourced from environment variables.
// The UI for setting the key has been removed for security and simplicity.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const geminiService = {
    async generateQuiz(topic, numQuestions) {
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
            showToast("AI Quiz generation failed. Please check the console for details.", "error");
            return null;
        }
    },

    async generateLessonPlan(topic, grade, weeks) {
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
            showToast("AI Lesson Plan generation failed. Please check the console for details.", "error");
            return null;
        }
    },

    async generateTimetable(classes, offLimits, teachersAndSubjects) {
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
            showToast("AI Timetable generation failed. Please check constraints and console for details.", "error");
            return null;
        }
    },
    
    async generateSimpleText(prompt) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            return response.text;
        } catch (error) {
            console.error("Error generating text:", error);
            showToast("An AI generation task failed. Please check the console for details.", "error");
            return null;
        }
    },
    
    async startChat() {
        const state = getState();
        
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: state.chatHistory.slice(0, -1),
             config: {
                systemInstruction: `You are Study Buddy, an AI assistant designed to be a friendly, patient, and encouraging tutor for high school students.
- Your primary goal is to help students understand concepts, not just give them the answer. Guide them with step-by-step explanations and Socratic questioning.
- Always use markdown (like **bold** for key terms) to make your explanations clear and easy to read.
- Keep your responses concise and break down complex topics into smaller, digestible parts.
- End your responses with an open-ended question to encourage further conversation, like "Does that make sense?" or "What would you like to explore next?".
- The student you are helping is ${state.currentStudent?.name}, who is in ${state.currentStudent?.class}. Address them by their name occasionally to build rapport.`
            }
        });
        setState({ activeChat: chat });
        return chat;
    },

    async generateExamQuestions(topic, questionCounts) {
        const { mcq, short_answer, paragraph } = questionCounts;
        const prompt = `Generate an exam on the topic: "${topic}".
        It should contain:
        - ${mcq} multiple-choice questions (type: 'mcq'). For these, provide 4 options and an answer.
        - ${short_answer} short-answer questions (type: 'short_answer'). For these, provide a brief, ideal answer. options should be null.
        - ${paragraph} paragraph-style questions (type: 'paragraph'). For these, provide a model paragraph answer or a detailed rubric. options should be null.
        Ensure the JSON output adheres to the schema exactly. The 'options' property must be null for non-mcq questions.`;

        try {
             const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING },
                                        question: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                                        answer: { type: Type.STRING }
                                    },
                                    required: ["type", "question", "answer"],
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
            showToast('Failed to generate exam questions. Please check the console for details.', 'error');
            return null;
        }
    },

    async gradeEssay(prompt, essay) {
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
            showToast("Failed to get AI feedback. Please check the console for details.", "error");
            return null;
        }
    },

    async gradeExamAnswers(questionsAndAnswers) {
        const prompt = `You are an AI teaching assistant. Grade the student's answers for the following questions.
        Compare the student's answer to the provided model answer.
        - For 'short_answer' type, assign a score of 1 for a correct/very similar answer, and 0 otherwise.
        - For 'paragraph' type, assign a score from 0 to 5 based on relevance, detail, and accuracy compared to the model answer.
        Return a JSON object with an array of scores, adhering to the schema.

        Questions and Student Answers:
        ${JSON.stringify(questionsAndAnswers)}
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
                            scores: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        questionIndex: { type: Type.NUMBER },
                                        score: { type: Type.NUMBER }
                                    },
                                    required: ["questionIndex", "score"]
                                }
                            }
                        },
                        required: ["scores"]
                    }
                }
            });
            return JSON.parse(response.text).scores;
        } catch (error) {
            console.error("AI exam grading error:", error);
            showToast("AI failed to grade written answers. Please check the console for details.", "error");
            return null;
        }
    },

    async generateDifferentiatedMaterials(topic) {
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
             showToast("Failed to generate materials. Please check the console for details.", "error");
             return null;
        }
    },

    async generateProactiveMessage(studentName, subject, score, totalQuestions) {
        const prompt = `A student named ${studentName} just completed an exam in ${subject} and scored ${score} out of ${totalQuestions}.
        Write a short, friendly, and encouraging message (2-3 sentences) for their AI Study Buddy to display when they next open it.
        The message should acknowledge their effort, gently offer help with the topic, and avoid sounding judgmental.
        Frame it as the Study Buddy speaking, and start with a friendly emoji like ✨ or 👋.`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            return response.text;
        } catch (error) {
            console.error("Error generating proactive message:", error);
            // Don't show a toast for this background task, just log it.
            return null;
        }
    },
};