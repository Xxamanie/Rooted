/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, setState } from './state.js';
import { showToast } from './ui/dom-utils.js';
import { API_BASE_URL } from './ui/utils.js';

// =================================================================
// --- API SERVICE (Live Backend)
// =================================================================

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'An unknown error occurred.');
    }
    return response.json();
};

const get = (endpoint) => fetch(`${API_BASE_URL}${endpoint}`).then(handleResponse);
const post = (endpoint, body) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}).then(handleResponse);
const del = (endpoint) => fetch(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' }).then(handleResponse);
const put = (endpoint, body) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}).then(handleResponse);


export const api = {
    async loadInitialState() {
        // The bootstrap endpoint loads all initial data in one go.
        const initialState = await get('/api/bootstrap');
        // We still use localStorage for the current user session
        const currentUser = JSON.parse(localStorage.getItem('smartschool_currentUser') || 'null');
        const currentStudent = JSON.parse(localStorage.getItem('smartschool_currentStudent') || 'null');
        const currentParent = JSON.parse(localStorage.getItem('smartschool_currentParent') || 'null');
        
        return {
            ...initialState,
            currentUser,
            currentStudent,
            currentParent,
            activeChat: null,
            chatHistory: [],
        };
    },

    async teacherLogin(schoolCode, staffId) {
         try {
            const { user, staff: updatedStaff } = await post('/api/auth', { type: 'teacher', schoolCode, staffId });
            if (user) {
                localStorage.setItem('smartschool_currentUser', JSON.stringify(user));
                setState({ currentUser: user, staff: updatedStaff }, { rerender: true });
                return user;
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
    
    async studentLogin(studentId, accessCode) {
        try {
            const { user } = await post('/api/auth', { type: 'student', studentId, accessCode });
            if (user) {
                localStorage.setItem('smartschool_currentStudent', JSON.stringify(user));
                setState({ currentStudent: user }, { rerender: true });
                return user;
            }
            return null;
        } catch(e) {
            console.error(e);
            return null;
        }
    },
    
    async parentLogin(parentId, accessCode) {
        try {
            const { user } = await post('/api/auth', { type: 'parent', parentId, accessCode });
            if (user) {
                localStorage.setItem('smartschool_currentParent', JSON.stringify(user));
                setState({ currentParent: user }, { rerender: true });
                return user;
            }
            return null;
        } catch(e) {
            console.error(e);
            return null;
        }
    },

    logout() {
        localStorage.removeItem('smartschool_currentUser');
        localStorage.removeItem('smartschool_currentStudent');
        localStorage.removeItem('smartschool_currentParent');
        setState({
            currentUser: null,
            currentStudent: null,
            currentParent: null,
            activeChat: null,
            chatHistory: [],
        }, { rerender: true });
        return Promise.resolve();
    },

    // --- Data mutation APIs ---
    async addStaff(name, role) {
        const newStaff = { id: 'SID-' + Math.floor(1000 + Math.random() * 9000), name, role, lastSeen: 'Never' };
        await post('/api/data/staff', newStaff);
        return newStaff;
    },
    
    async removeStaff(id) {
        return del(`/api/data/staff/${id}`);
    },

    async addStudent(name, className) {
        const newStudent = { id: 'STU-' + Math.floor(1000 + Math.random() * 9000), name, class: className };
        await post('/api/data/students', newStudent);
        return newStudent;
    },
    
    async removeStudent(id) {
        return del(`/api/data/students/${id}`);
    },

    async addParent(name, studentIds) {
        const newParent = { id: 'PAR-' + Math.floor(100 + Math.random() * 900), name, studentIds };
        return post('/api/data/parents', newParent);
    },

    async removeParent(id) {
        return del(`/api/data/parents/${id}`);
    },
    
    async postAnnouncement(text) {
        const newAnnouncement = { text, date: new Date().toLocaleString() };
        return post('/api/data/announcements', newAnnouncement);
    },

    async addScheme(term, subject, details) {
        const newScheme = { term, subject, details };
        return post('/api/data/schemes', newScheme);
    },

    async addRecordOfWork(recordData) {
        const newRecord = { ...recordData, dateSubmitted: new Date().toLocaleString() };
        return post('/api/data/recordsOfWork', newRecord);
    },
    
    async saveAttendance(className, records) {
        return post('/api/actions/save-attendance', { className, records });
    },
    
    async processTuitionPayment(studentId) {
        return post('/api/actions/process-tuition', { studentId });
    },
    
    async addExamination(exam) {
        const newExam = { ...exam, id: 'EXM-' + Date.now() };
        return post('/api/data/examinations', newExam);
    },

    async removeExamination(id) {
        return del(`/api/data/examinations/${id}`);
    },

    async addCompletedExam(completedExam) {
        return post('/api/data/completedExams', {...completedExam, proctoringFlags: []});
    },

    async updateCompletedExam(updateData) {
        return put('/api/actions/update-completed-exam', updateData);
    },

    async addProctoringFlag(studentId, examId, event) {
        return post('/api/actions/add-proctoring-flag', { studentId, examId, event });
    },

    async addEssayAssignment(assignment) {
        const newAssignment = { ...assignment, id: 'ESSAY-' + Date.now() };
        return post('/api/data/essayAssignments', newAssignment);
    },

    async addEssaySubmission(submission) {
        return post('/api/actions/add-essay-submission', submission);
    },
    
    async updateEssayFeedback(assignmentId, studentId, feedback, score) {
        return put('/api/actions/update-essay-feedback', { assignmentId, studentId, feedback, score });
    },

    async updateGrade(gradeData) {
        return put('/api/actions/update-grade', gradeData);
    },

    async addLessonPlan(planData) {
        const newPlan = { ...planData, id: 'LP-' + Date.now() };
        return post('/api/data/lessonPlans', newPlan);
    },

    async updateLessonPlan(planId, updatedData) {
        return put(`/api/data/lessonPlans/${planId}`, updatedData);
    },

    async removeLessonPlan(planId) {
        return del(`/api/data/lessonPlans/${planId}`);
    },

    async addQuestionToBank(question) {
        const newQuestion = { ...question, id: 'Q-' + Date.now() };
        return post('/api/data/questionBank', newQuestion);
    },
    
    async removeQuestionFromBank(id) {
        return del(`/api/data/questionBank/${id}`);
    },
    
    async addTask(text) {
        const newTask = { id: Date.now(), text, completed: false };
        return post('/api/data/tasks', newTask);
    },

    async updateTaskStatus(id, completed) {
        return put(`/api/data/tasks/${id}`, { completed });
    },

    async removeTask(id) {
        return del(`/api/data/tasks/${id}`);
    },

    async markNotificationsAsRead(notificationIds) {
        return put('/api/actions/mark-notifications-read', { notificationIds });
    },

    // Creator APIs
    async registerSchool(schoolName, subscriptionDetails) {
        const code = 'SMRT-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const newSchool = {
            id: 'SCH-' + Date.now(),
            name: schoolName,
            code,
            subscription: {
                type: subscriptionDetails.type || 'Annually',
                status: subscriptionDetails.type === 'Termly' ? '1st Term Paid' : 'Active',
                costAnnually: subscriptionDetails.costAnnually || 1000,
                costPerTerm: subscriptionDetails.costPerTerm || 400
            }
        };
        await post('/api/data/schools', newSchool);
        
        // Add the new school to the local state so the UI updates immediately.
        const { schools } = getState();
        setState({ schools: [...schools, newSchool] });
        
        return newSchool;
    },

    async updateSchoolSubscription(schoolId, newSubscriptionDetails) {
        const updatedSchool = await put(`/api/data/schools/${schoolId}`, { subscription: newSubscriptionDetails });
        const { schools } = getState();
        const updatedSchools = schools.map(school => 
            school.id === schoolId ? updatedSchool : school
        );
        setState({ schools: updatedSchools });
        return updatedSchool;
    },
    
    async broadcastMessage(message) {
        const newBroadcast = await post('/api/actions/broadcast-message', { message });
        setState({ broadcastMessage: newBroadcast }); // Optimistic update for sender
    },
    async clearBroadcastMessage() {
        await del('/api/actions/broadcast-message');
        setState({ broadcastMessage: null }, { rerender: true });
    },
    async sendAdminMessage(message) {
        const newAdminMessage = await post('/api/actions/admin-message', { message });
        setState({ adminMessage: newAdminMessage }); // Optimistic update for sender
    },
    async clearAdminMessage() {
        await del('/api/actions/admin-message');
        setState({ adminMessage: null }, { rerender: true });
    },
    resetAllData() {
        // This is now a server-side action
        return post('/api/actions/reset-data', {});
    }
};