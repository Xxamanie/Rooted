/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, setState } from '../state.js';
import { showToast } from "../ui/dom-utils.js";

const API_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const API_MODEL = "gpt-4o-mini";

// Helper to make API calls to OpenAI
const callOpenAI = async (messages) => {
    const { openAiApiKey } = getState();
    if (!openAiApiKey) {
        showToast("OpenAI API Key is not set. Please set it in the AI Settings.", "error");
        return null;
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiApiKey}`
            },
            body: JSON.stringify({
                model: API_MODEL,
                messages: messages,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);

    } catch (error) {
        console.error("OpenAI API call failed:", error);
        showToast(`OpenAI API Error: ${error.message}`, "error");
        return null;
    }
};

const callOpenAIText = async (prompt) => {
     const { openAiApiKey } = getState();
    if (!openAiApiKey) {
        showToast("OpenAI API Key is not set. Please set it in the AI Settings.", "error");
        return null;
    }
     try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiApiKey}`
            },
            body: JSON.stringify({
                model: API_MODEL,
                messages: [{ role: 'user', content: prompt }],
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("OpenAI API call failed:", error);
        showToast(`OpenAI API Error: ${error.message}`, "error");
        return null;
    }
}


export const openaiService = {
    async generateQuiz(topic, numQuestions) {
        const prompt = `Generate a multiple-choice quiz with ${numQuestions} questions on the topic: "${topic}". Respond with a JSON object containing a single key "quiz", which is an array of objects. Each object should have keys "question", "options" (an array of 4 strings), and "answer" (the correct string from options).`;
        const result = await callOpenAI([{ role: 'user', content: prompt }]);
        return result?.quiz || null;
    },

    async generateLessonPlan(topic, grade, weeks) {
        const prompt = `Generate a ${weeks}-week lesson plan for the topic "${topic}" for ${grade}. Respond with a JSON object with a single key "plan" containing: "topic", "gradeLevel", "durationWeeks", "learningObjectives" (array of strings), "weeklyBreakdown" (array of objects with "week", "topic", "activities"), and "assessmentMethods" (array of strings).`;
        const result = await callOpenAI([{ role: 'user', content: prompt }]);
        return result?.plan || null;
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
            - Respond with a JSON object with a single key "scheduleByTime". This should be an array of objects, where each object represents a time slot and has keys: "time", "monday", "tuesday", "wednesday", "thursday", "friday".
            - The value for each day should be a string in the format: "Class Name - Subject (Teacher Name)" or "Break" if empty/off-limits.
        `;
        const result = await callOpenAI([{ role: 'user', content: prompt }]);
        return result?.scheduleByTime || null;
    },
    
    async generateSimpleText(prompt) {
        return callOpenAIText(prompt);
    },
    
    // OpenAI chat is stateless, so "startChat" is a no-op. The history is sent with each message.
    async startChat() {
        const { currentStudent } = getState();
        const systemPrompt = `You are Study Buddy, an AI assistant designed to be a friendly, patient, and encouraging tutor for high school students.
- Your primary goal is to help students understand concepts, not just give them the answer. Guide them with step-by-step explanations and Socratic questioning.
- Always use markdown (like **bold** for key terms) to make your explanations clear and easy to read.
- Keep your responses concise and break down complex topics into smaller, digestible parts.
- End your responses with an open-ended question to encourage further conversation, like "Does that make sense?" or "What would you like to explore next?".
- The student you are helping is ${currentStudent?.name}, who is in ${currentStudent?.class}. Address them by their name occasionally to build rapport.`;

        // We create a "pseudo" chat object that holds the system prompt.
        const chat = {
            systemPrompt,
            // The sendMessageStream method will be called by the UI
            sendMessageStream: async ({ message }) => {
                const { chatHistory } = getState();
                // We need to format the history for OpenAI's API
                const messages = [
                    { role: 'system', content: chat.systemPrompt },
                    ...chatHistory.map(h => ({ role: h.role, content: h.parts[0].text })),
                    { role: 'user', content: message }
                ];
                
                const fullResponse = await callOpenAIText(messages);
                
                // We mock the streaming response by returning an async generator
                // that yields a single chunk with the full text.
                return (async function*() {
                    yield { text: fullResponse };
                })();
            }
        };
        setState({ activeChat: chat });
        return chat;
    },

    async generateExamQuestions(topic, questionCounts) {
        const { mcq, short_answer, paragraph } = questionCounts;
        const prompt = `Generate an exam on the topic: "${topic}".
        It should contain:
        - ${mcq} multiple-choice questions (type: 'mcq'). For these, provide 4 options and an answer.
        - ${short_answer} short-answer questions (type: 'short_answer'). For these, provide a brief, ideal answer. 'options' should be null.
        - ${paragraph} paragraph-style questions (type: 'paragraph'). For these, provide a model paragraph answer or a detailed rubric. 'options' should be null.
        Respond with a JSON object containing a single "questions" key, which is an array of question objects. Each object must have "type", "question", "options" (an array of strings, or null), and "answer" (a string).`;
        const result = await callOpenAI([{ role: 'user', content: prompt }]);
        return result?.questions || null;
    },

    async gradeEssay(prompt, essay) {
        const fullPrompt = `
            You are an AI teaching assistant. Grade the following student essay based on the provided prompt. 
            Provide constructive feedback covering clarity, relevance to the prompt, and grammar.
            Also, provide a suggested score out of 100.

            **Assignment Prompt:** ${prompt}
            **Student's Essay:** ${essay}

            Respond with a JSON object with two keys: "feedback" (a string) and "suggestedScore" (a number).
        `;
        return await callOpenAI([{ role: 'user', content: fullPrompt }]);
    },

    async gradeExamAnswers(questionsAndAnswers) {
        const prompt = `You are an AI teaching assistant. Grade the student's answers for the following questions.
        Compare the student's answer to the provided model answer.
        - For 'short_answer' type, assign a score of 1 for a correct/very similar answer, and 0 otherwise.
        - For 'paragraph' type, assign a score from 0 to 5 based on relevance, detail, and accuracy compared to the model answer.
        
        Questions and Student Answers: ${JSON.stringify(questionsAndAnswers)}

        Respond with a JSON object containing a single key "scores", which is an array of objects. Each object should have "questionIndex" and "score".
        `;
        const result = await callOpenAI([{ role: 'user', content: prompt }]);
        return result?.scores || null;
    },

    async generateDifferentiatedMaterials(topic) {
        const prompt = `For the topic "${topic}", generate differentiated learning materials for three student groups: "Support", "Core", and "Advanced". Respond with a JSON object containing a single key "materials", which is an array of objects. Each object should have keys "level", "focus", and "activities" (an array of 2-3 strings).`;
        const result = await callOpenAI([{ role: 'user', content: prompt }]);
        return result?.materials || null;
    },

    async generateProactiveMessage(studentName, subject, score, totalQuestions) {
        const prompt = `A student named ${studentName} just completed an exam in ${subject} and scored ${score} out of ${totalQuestions}.
        Write a short, friendly, and encouraging message (2-3 sentences) for their AI Study Buddy to display when they next open it.
        The message should acknowledge their effort, gently offer help with the topic, and avoid sounding judgmental.
        Frame it as the Study Buddy speaking, and start with a friendly emoji like ✨ or 👋.`;
        return callOpenAIText(prompt);
    },
};
