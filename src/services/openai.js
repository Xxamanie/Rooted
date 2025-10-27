/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, setState } from '../state.js';
import { showToast } from "../ui/dom-utils.js";
import { showApiKeyModal } from "../ui/views/teacher-shell.js";

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const getOpenAiClient = () => {
    const { openaiApiKey } = getState();
    if (!openaiApiKey) {
        showToast("Please set your OpenAI API Key in the settings.", "error");
        showApiKeyModal();
        return null;
    }
    return openaiApiKey;
};

const callApi = async (messages, useJson = false, stream = false) => {
    const apiKey = getOpenAiClient();
    if (!apiKey) return null;

    const body = {
        model: MODEL,
        messages,
        stream,
    };
    if (useJson) {
        body.response_format = { "type": "json_object" };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message || 'OpenAI API Error');
        }
        
        return response;

    } catch (error) {
        console.error("OpenAI API Error:", error);
        showToast(`OpenAI API call failed: ${error.message}`, "error");
        return null;
    }
};


// Helper to format Gemini-style history to OpenAI-style messages
const formatHistoryToMessages = (systemPrompt, history) => {
    const messages = [{ role: 'system', content: systemPrompt }];
    history.forEach(item => {
        messages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.parts[0].text
        });
    });
    return messages;
};

export const openaiService = {
    async generateQuiz(topic, numQuestions) {
        const systemPrompt = `You are an AI that generates quizzes. Respond with a JSON object with a single key "quiz" which is an array of objects. Each object should have "question" (string), "options" (array of 4 strings), and "answer" (string).`;
        const userPrompt = `Generate a multiple-choice quiz with ${numQuestions} questions on the topic: "${topic}". For each question, provide 4 options and indicate the correct answer.`;
        
        const response = await callApi([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], true);
        
        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content).quiz;
    },

    async generateLessonPlan(topic, grade, weeks) {
        const systemPrompt = `You are an AI that generates lesson plans. Respond with a JSON object with a single key "plan" which is an object containing: "topic" (string), "gradeLevel" (string), "durationWeeks" (number), "learningObjectives" (array of strings), "weeklyBreakdown" (array of objects with week, topic, activities), and "assessmentMethods" (array of strings).`;
        const userPrompt = `Generate a ${weeks}-week lesson plan for the topic "${topic}" for ${grade}. Include learning objectives, a week-by-week breakdown of topics, suggested class activities or projects, and assessment methods.`;

        const response = await callApi([
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
        ], true);

        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content).plan;
    },
    
    async generateTimetable(classes, offLimits, teachersAndSubjects) {
        const systemPrompt = `You are an expert school scheduler. Create a 5-day (Monday-Friday) weekly timetable from 09:00 to 16:00, with 1-hour slots. Respond with a JSON object with a single key "scheduleByTime", which is an array of objects. Each object should have keys: "time", "monday", "tuesday", "wednesday", "thursday", "friday". The schedule entry should be a string in the format: "Class Name - Subject (Teacher Name)". If a time slot is off-limits or free, the entry should be the string "Break".`;
        const userPrompt = `**Constraints:**\n- Teachers and their subjects: ${teachersAndSubjects}\n- Classes to schedule: ${classes}\n- Off-limit times (no classes): ${offLimits || 'None'}\n- Ensure a teacher teaches only one class at a time.\n- Ensure a class is only taught one subject at a time.`;

        const response = await callApi([
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
        ], true);

        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content).scheduleByTime;
    },

    async generateSimpleText(prompt) {
        const response = await callApi([{ role: 'user', content: prompt }]);
        if (!response) return null;
        const data = await response.json();
        return data.choices[0].message.content;
    },
    
    startChat() {
        const state = getState();
        const systemPrompt = `You are Study Buddy, an AI assistant designed to be a friendly, patient, and encouraging tutor for high school students.
- Your primary goal is to help students understand concepts, not just give them the answer. Guide them with step-by-step explanations and Socratic questioning.
- Always use markdown (like **bold** for key terms) to make your explanations clear and easy to read.
- Keep your responses concise and break down complex topics into smaller, digestible parts.
- End your responses with an open-ended question to encourage further conversation, like "Does that make sense?" or "What would you like to explore next?".
- The student you are helping is ${state.currentStudent?.name}, who is in ${state.currentStudent?.class}. Address them by their name occasionally to build rapport.`;

        const chat = {
            sendMessageStream: async function* ({ message }) {
                const currentHistory = getState().chatHistory;
                const messages = formatHistoryToMessages(systemPrompt, currentHistory);
                
                const response = await callApi(messages, false, true);
                if (!response || !response.body) return;

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6);
                            if (data === '[DONE]') return;
                            try {
                                const json = JSON.parse(data);
                                const text = json.choices[0].delta.content;
                                if (text) {
                                    yield { text }; // Yield a Gemini-compatible chunk
                                }
                            } catch (e) {
                                console.error('Error parsing stream chunk:', e);
                            }
                        }
                    }
                }
            }
        };
        
        setState({ activeChat: chat });
        return chat;
    },
    
    async generateExamQuestions(topic, questionCounts) {
        const { mcq, short_answer, paragraph } = questionCounts;
        const systemPrompt = `You are an AI that creates exams. Respond with a JSON object with a single key "questions", an array of objects. Each object must have "type" (string: 'mcq', 'short_answer', or 'paragraph'), "question" (string), "options" (array of 4 strings for mcq, null otherwise), and "answer" (string).`;
        const userPrompt = `Generate an exam on the topic: "${topic}". It should contain:\n- ${mcq} multiple-choice questions.\n- ${short_answer} short-answer questions.\n- ${paragraph} paragraph-style questions.`;

        const response = await callApi([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], true);

        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content).questions;
    },

    async gradeEssay(prompt, essay) {
         const systemPrompt = `You are an AI teaching assistant. Respond with a JSON object with two keys: "feedback" (string, constructive feedback) and "suggestedScore" (number, 0-100).`;
         const userPrompt = `Grade the following student essay based on the provided prompt. Provide constructive feedback covering clarity, relevance to the prompt, and grammar. Also, provide a suggested score out of 100.\n\n**Assignment Prompt:** ${prompt}\n**Student's Essay:** ${essay}`;

        const response = await callApi([
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
        ], true);

        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    },

    async gradeExamAnswers(questionsAndAnswers) {
        const systemPrompt = `You are an AI grader. Return a JSON object with a single key "scores", an array of objects. Each object must have "questionIndex" (number) and "score" (number).`;
        const userPrompt = `Grade the student's answers for the following questions. Compare the student's answer to the provided model answer.\n- For 'short_answer' type, assign a score of 1 for a correct/very similar answer, and 0 otherwise.\n- For 'paragraph' type, assign a score from 0 to 5 based on relevance, detail, and accuracy compared to the model answer.\n\nQuestions and Student Answers:\n${JSON.stringify(questionsAndAnswers)}`;

        const response = await callApi([
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
        ], true);

        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content).scores;
    },
    
     async generateDifferentiatedMaterials(topic) {
        const systemPrompt = `You are an AI that generates differentiated learning materials. Respond with a JSON object with a single key "materials", which is an array of objects. Each object should have "level" (string: "Support", "Core", or "Advanced"), "focus" (string), and "activities" (array of 2-3 strings).`;
        const userPrompt = `For the topic "${topic}", generate differentiated learning materials for three student groups: "Support", "Core", and "Advanced". For each group, provide a brief description of the material's focus and a list of 2-3 specific activities or resources.`;

        const response = await callApi([
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
        ], true);
        
        if (!response) return null;
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content).materials;
    },
    
    async generateProactiveMessage(studentName, subject, score, totalQuestions) {
        const userPrompt = `A student named ${studentName} just completed an exam in ${subject} and scored ${score} out of ${totalQuestions}. Write a short, friendly, and encouraging message (2-3 sentences) for their AI Study Buddy to display when they next open it. The message should acknowledge their effort, gently offer help with the topic, and avoid sounding judgmental. Frame it as the Study Buddy speaking, and start with a friendly emoji like ✨ or 👋.`;
        return this.generateSimpleText(userPrompt);
    },
};
