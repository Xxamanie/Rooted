/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, Chat, Content } from "@google/genai";

// =================================================================
// --- STATE & TYPES
// =================================================================

type Student = { id: string; name: string; class: string };
type Staff = { id: string; name: string; role: string; lastSeen: string; };
type Parent = { id:string; name: string; studentIds: string[]; };
type Announcement = { text: string; date: string };
type Scheme = { term: string; subject: string; details: string };
type RecordOfWork = {
    teacherId: string;
    teacherName: string;
    subject: string;
    class: string;
    week: string;
    topics: string;
    assessment: string;
    dateSubmitted: string;
};
type AttendanceRecord = { date: string, class: string, records: { studentId: string; status: 'Present' | 'Absent' | 'Late' }[] };
type TuitionRecord = { studentId: string; status: 'Paid' | 'Owing'; amount: number };
type ExamQuestion = {
    question: string;
    options: string[];
    answer: string;
};
type Examination = {
    id: string;
    title: string;
    className: string;
    subject: string;
    term: string;
    duration: number;
    instructions: string;
    questions: ExamQuestion[];
};
type Grade = {
    studentId: string;
    term: string; // 'First Term', 'Second Term', 'Third Term'
    subject: string;
    ca1: number | null;
    ca2: number | null;
    ca3: number | null;
    exam: number | null;
    total: number;
    remarks: string;
};
type AccessCode = { studentId: string; code: string; };
type ParentAccessCode = { parentId: string; code: string; };
type CompletedExam = { studentId: string; examId: string; score: number, scaledScore: number, proctoringFlags: { timestamp: string, event: string }[] };
type ManualQuestion = {
    id: string;
    type: 'mcq' | 'text' | 'image' | 'pdf';
    content: string; // for text question, or MC question text, or image/pdf data URL
    options?: string[]; // for mcq
    answer?: string; // for mcq
    fileName?: string; // for pdf
};
type EssayAssignment = { id: string; title: string; prompt: string; className: string; };
type EssaySubmission = { assignmentId: string; studentId: string; studentName: string; submissionText: string; feedback?: string; score?: number; };


type AppState = {
    staff: Staff[];
    students: Student[];
    parents: Parent[];
    announcements: Announcement[];
    schemes: Scheme[];
    recordsOfWork: RecordOfWork[];
    attendanceRecords: AttendanceRecord[];
    tuitionRecords: TuitionRecord[];
    examinations: Examination[];
    completedExams: CompletedExam[];
    essayAssignments: EssayAssignment[];
    essaySubmissions: EssaySubmission[];
    grades: Grade[];
    accessCodes: AccessCode[];
    parentAccessCodes: ParentAccessCode[];
    questionBank: ManualQuestion[];
    timetable: any[] | null;
    currentUser: Staff | null;
    currentStudent: Student | null;
    currentParent: Parent | null;
    activeChat: Chat | null;
    chatHistory: Content[];
}

let state: AppState = {
    staff: [],
    students: [],
    parents: [],
    announcements: [],
    schemes: [],
    recordsOfWork: [],
    attendanceRecords: [],
    tuitionRecords: [],
    examinations: [],
    completedExams: [],
    essayAssignments: [],
    essaySubmissions: [],
    grades: [],
    accessCodes: [],
    parentAccessCodes: [],
    questionBank: [],
    timetable: null,
    currentUser: null,
    currentStudent: null,
    currentParent: null,
    activeChat: null,
    chatHistory: [],
};
let apiKey: string | null = null;
let isLiveMode = false;
let studentWebcamStream: MediaStream | null = null;
let cameraModalStream: MediaStream | null = null;
const VALID_SCHOOL_CODE = 'SMRT-2024';
let activeExamTimer: number | null = null;
let activeExamProctoringListeners: (() => void) | null = null;

// =================================================================
// --- DOM ELEMENT SELECTORS
// =================================================================

// Main App Views
const loginPage = document.getElementById('login-page');
const teacherApp = document.getElementById('teacher-app');
const studentPortal = document.getElementById('student-portal');
const parentPortal = document.getElementById('parent-portal');
const studentMainContent = document.getElementById('student-main-content');
const studentDashboard = document.getElementById('student-dashboard');

// Teacher App Elements
const pageTitle = document.getElementById('pageTitle');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');
const welcomeMessage = document.getElementById('welcome-message');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');
const headerStatus = document.getElementById('header-status');

// Login Page Elements
const loginTabs = document.querySelectorAll('.login-tab-btn');
const loginForms = document.querySelectorAll('.login-form');

// Student Portal Elements
const studentWelcomeMessage = document.getElementById('student-welcome-message');
const studentAvatar = document.getElementById('student-avatar');
const studentLogoutBtn = document.getElementById('student-logout-btn');
const studentAnnouncementList = document.getElementById('student-announcement-list');
const studentExamList = document.getElementById('student-exam-list');
const studentReportCardContainer = document.getElementById('student-report-card-container');
const studentStudyBuddyCard = document.getElementById('student-study-buddy-card');
const studentEssayList = document.getElementById('student-essay-list');


// Parent Portal Elements
const parentWelcomeMessage = document.getElementById('parent-welcome-message');
const parentAvatar = document.getElementById('parent-avatar');
const parentLogoutBtn = document.getElementById('parent-logout-btn');
const parentDashboardContainer = document.getElementById('parent-dashboard-container');

// Study Buddy Chat Elements
const studyBuddyView = document.getElementById('study-buddy-view');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const chatMessagesContainer = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const chatSendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;

// API Key Modal selectors
const settingsBtn = document.getElementById('settings-btn');
const apiKeyModal = document.getElementById('api-key-modal');
const closeApiKeyModalBtn = document.querySelector('#api-key-modal .modal-close-btn');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;

// Exam View Modal selectors
const viewExamModal = document.getElementById('view-exam-modal');
const viewExamModalContent = document.getElementById('view-exam-modal-content');
const closeViewExamModalBtn = document.querySelector('#view-exam-modal .modal-close-btn');
const viewEssayModal = document.getElementById('view-essay-modal');
const viewEssayModalContent = document.getElementById('view-essay-modal-content');
const closeViewEssayModalBtn = document.querySelector('#view-essay-modal .modal-close-btn');


// Camera Modal selectors
const cameraModal = document.getElementById('camera-modal');
const closeCameraModalBtn = document.querySelector('#camera-modal .modal-close-btn');
const cameraFeed = document.getElementById('camera-feed') as HTMLVideoElement;
const captureImageBtn = document.getElementById('capture-image-btn');

// =================================================================
// --- API SERVICE (Simulated Backend)
// =================================================================

const api = {
    _get(key: string) { return JSON.parse(localStorage.getItem(key) || 'null'); },
    _set(key: string, value: any) { localStorage.setItem(key, JSON.stringify(value)); },

    _simulateNetwork(callback: () => any) {
        return new Promise(resolve => {
            setTimeout(() => {
                const result = callback();
                resolve(result);
            }, isLiveMode ? 800 : 0);
        });
    },

    loadInitialState(): Promise<AppState> {
        return this._simulateNetwork(() => {
            const loadedState: AppState = {
                staff: this._get('smartschool_staff') || [],
                students: this._get('smartschool_students') || [],
                parents: this._get('smartschool_parents') || [],
                announcements: this._get('smartschool_announcements') || [],
                schemes: this._get('smartschool_schemes') || [],
                recordsOfWork: this._get('smartschool_recordsofwork') || [],
                attendanceRecords: this._get('smartschool_attendance') || [],
                tuitionRecords: this._get('smartschool_tuition') || [],
                examinations: this._get('smartschool_examinations') || [],
                completedExams: this._get('smartschool_completedexams') || [],
                essayAssignments: this._get('smartschool_essayassignments') || [],
                essaySubmissions: this._get('smartschool_essaysubmissions') || [],
                grades: this._get('smartschool_grades') || [],
                accessCodes: this._get('smartschool_accesscodes') || [],
                parentAccessCodes: this._get('smartschool_parentaccesscodes') || [],
                questionBank: this._get('smartschool_questionbank') || [],
                timetable: this._get('smartschool_timetable') || null,
                currentUser: this._get('smartschool_currentUser') || null,
                currentStudent: this._get('smartschool_currentStudent') || null,
                currentParent: this._get('smartschool_currentParent') || null,
                activeChat: null, // Always start fresh
                chatHistory: [],  // Always start fresh
            };

            // Seed data if empty
            if (loadedState.staff.length === 0) {
                loadedState.staff = [
                    { id: 'ADMIN-001', name: 'Mr. Admin', role: 'Administrator', lastSeen: 'N/A' },
                    { id: 'SID-8431', name: 'Mrs. Johnson', role: 'Mathematics', lastSeen: 'N/A' },
                    { id: 'SID-1932', name: 'Mr. Smith', role: 'English', lastSeen: 'N/A' },
                ];
            }
            if (loadedState.students.length === 0) {
                loadedState.students = [
                    { id: 'STU-0012', name: 'Alice Martin', class: 'Grade 10A' },
                    { id: 'STU-0013', name: 'Bob Williams', class: 'Grade 11B' },
                    { id: 'STU-0014', name: 'Charlie Brown', class: 'Grade 10A' },
                ];
            }
             // Sync tuition records with students
            loadedState.students.forEach(student => {
                if (!loadedState.tuitionRecords.some(t => t.studentId === student.id)) {
                    loadedState.tuitionRecords.push({ studentId: student.id, status: 'Owing', amount: 500 });
                }
            });

            Object.keys(loadedState).forEach(key => {
                if(key === 'activeChat' || key === 'chatHistory') return;
                const storageKey = `smartschool_${(key as keyof AppState).toString().toLowerCase()}`;
                if(this._get(storageKey) === null) {
                    this._set(storageKey, (loadedState as any)[key]);
                }
            });
            
            return loadedState;
        }) as Promise<AppState>;
    },

    addStaff(name: string, role: string): Promise<Staff> {
        return this._simulateNetwork(() => {
            const newStaff: Staff = { id: 'SID-' + Math.floor(1000 + Math.random() * 9000), name, role, lastSeen: 'Never' };
            state.staff.push(newStaff);
            this._set('smartschool_staff', state.staff);
            return newStaff;
        }) as Promise<Staff>;
    },
    
    removeStaff(id: string): Promise<void> {
        return this._simulateNetwork(() => {
            state.staff = state.staff.filter(s => s.id !== id);
            this._set('smartschool_staff', state.staff);
        }) as Promise<void>;
    },

    addStudent(name: string, className: string): Promise<Student> {
        return this._simulateNetwork(() => {
            const newStudent: Student = { id: 'STU-' + Math.floor(1000 + Math.random() * 9000), name, class: className };
            state.students.push(newStudent);
            this._set('smartschool_students', state.students);
            const newTuitionRecord: TuitionRecord = { studentId: newStudent.id, status: 'Owing', amount: 500 };
            state.tuitionRecords.push(newTuitionRecord);
            this._set('smartschool_tuition', state.tuitionRecords);
            return newStudent;
        }) as Promise<Student>;
    },
    
    removeStudent(id: string): Promise<void> {
        return this._simulateNetwork(() => {
            state.students = state.students.filter(s => s.id !== id);
            state.tuitionRecords = state.tuitionRecords.filter(t => t.studentId !== id);
            state.grades = state.grades.filter(g => g.studentId !== id);
            this._set('smartschool_students', state.students);
            this._set('smartschool_tuition', state.tuitionRecords);
            this._set('smartschool_grades', state.grades);
        }) as Promise<void>;
    },

    addParent(name: string, studentIds: string[]): Promise<Parent | null> {
        return this._simulateNetwork(() => {
            // Validate student IDs
            const validStudentIds = studentIds.filter(id => state.students.some(s => s.id === id));
            if (validStudentIds.length !== studentIds.length) {
                showToast('One or more student IDs are invalid.', 'error');
                return null;
            }
            const newParent: Parent = { id: 'PAR-' + Math.floor(100 + Math.random() * 900), name, studentIds: validStudentIds };
            state.parents.push(newParent);
            this._set('smartschool_parents', state.parents);
            return newParent;
        }) as Promise<Parent | null>;
    },

    removeParent(id: string): Promise<void> {
        return this._simulateNetwork(() => {
            state.parents = state.parents.filter(p => p.id !== id);
            this._set('smartschool_parents', state.parents);
        }) as Promise<void>;
    },
    
    postAnnouncement(text: string): Promise<Announcement> {
        return this._simulateNetwork(() => {
            const newAnnouncement: Announcement = { text, date: new Date().toLocaleString() };
            state.announcements.unshift(newAnnouncement);
            this._set('smartschool_announcements', state.announcements);
            return newAnnouncement;
        }) as Promise<Announcement>;
    },

    addScheme(term: string, subject: string, details: string): Promise<Scheme> {
        return this._simulateNetwork(() => {
            const newScheme: Scheme = { term, subject, details };
            state.schemes.unshift(newScheme);
            this._set('smartschool_schemes', state.schemes);
            return newScheme;
        }) as Promise<Scheme>;
    },

    addRecordOfWork(recordData: Omit<RecordOfWork, 'dateSubmitted'>): Promise<RecordOfWork> {
        return this._simulateNetwork(() => {
            const newRecord: RecordOfWork = { ...recordData, dateSubmitted: new Date().toLocaleString() };
            state.recordsOfWork.unshift(newRecord);
            this._set('smartschool_recordsofwork', state.recordsOfWork);
            return newRecord;
        }) as Promise<RecordOfWork>;
    },
    
    saveAttendance(className: string, records: { studentId: string; status: 'Present' | 'Absent' | 'Late' }[]): Promise<void> {
        return this._simulateNetwork(() => {
            const newRecord = { date: new Date().toLocaleDateString(), class: className, records };
            state.attendanceRecords = state.attendanceRecords.filter(r => !(r.date === newRecord.date && r.class === newRecord.class));
            state.attendanceRecords.push(newRecord);
            this._set('smartschool_attendance', state.attendanceRecords);
        }) as Promise<void>;
    },
    
    processTuitionPayment(studentId: string): Promise<void> {
        return this._simulateNetwork(() => {
            const record = state.tuitionRecords.find(t => t.studentId === studentId);
            if (record) {
                record.status = 'Paid';
                this._set('smartschool_tuition', state.tuitionRecords);
            }
        }) as Promise<void>;
    },
    
     addExamination(exam: Omit<Examination, 'id'>): Promise<Examination> {
        return this._simulateNetwork(() => {
            const newExam: Examination = { ...exam, id: 'EXM-' + Date.now() };
            state.examinations.unshift(newExam);
            this._set('smartschool_examinations', state.examinations);
            return newExam;
        }) as Promise<Examination>;
    },

    removeExamination(id: string): Promise<void> {
        return this._simulateNetwork(() => {
            state.examinations = state.examinations.filter(ex => ex.id !== id);
            this._set('smartschool_examinations', state.examinations);
        }) as Promise<void>;
    },

    addCompletedExam(completedExam: Omit<CompletedExam, 'proctoringFlags'>): Promise<void> {
        return this._simulateNetwork(() => {
            state.completedExams.push({...completedExam, proctoringFlags: []});
            this._set('smartschool_completedexams', state.completedExams);
        }) as Promise<void>;
    },

    addProctoringFlag(studentId: string, examId: string, event: string): Promise<void> {
        return this._simulateNetwork(() => {
            const examRecord = state.completedExams.find(c => c.studentId === studentId && c.examId === examId);
            if (examRecord) {
                examRecord.proctoringFlags.push({ timestamp: new Date().toLocaleTimeString(), event });
                this._set('smartschool_completedexams', state.completedExams);
            }
        }) as Promise<void>;
    },

    addEssayAssignment(assignment: Omit<EssayAssignment, 'id'>): Promise<EssayAssignment> {
        return this._simulateNetwork(() => {
            const newAssignment: EssayAssignment = { ...assignment, id: 'ESSAY-' + Date.now() };
            state.essayAssignments.unshift(newAssignment);
            this._set('smartschool_essayassignments', state.essayAssignments);
            return newAssignment;
        }) as Promise<EssayAssignment>;
    },

    addEssaySubmission(submission: Omit<EssaySubmission, 'studentName'>): Promise<EssaySubmission> {
        return this._simulateNetwork(() => {
            const student = state.students.find(s => s.id === submission.studentId);
            if (!student) throw new Error("Student not found for submission");
            
            const newSubmission: EssaySubmission = { ...submission, studentName: student.name };
            // Remove previous submission if exists
            state.essaySubmissions = state.essaySubmissions.filter(s => !(s.assignmentId === newSubmission.assignmentId && s.studentId === newSubmission.studentId));
            state.essaySubmissions.push(newSubmission);
            this._set('smartschool_essaysubmissions', state.essaySubmissions);
            return newSubmission;
        }) as Promise<EssaySubmission>;
    },
    
    updateEssayFeedback(assignmentId: string, studentId: string, feedback: string, score: number): Promise<void> {
        return this._simulateNetwork(() => {
            const submission = state.essaySubmissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
            if (submission) {
                submission.feedback = feedback;
                submission.score = score;
                this._set('smartschool_essaysubmissions', state.essaySubmissions);
            }
        }) as Promise<void>;
    },


    updateGrade(gradeData: Partial<Grade> & { studentId: string, term: string, subject: string }): Promise<void> {
        return this._simulateNetwork(() => {
            let grade = state.grades.find(g => 
                g.studentId === gradeData.studentId &&
                g.term === gradeData.term &&
                g.subject === gradeData.subject
            );

            if (!grade) {
                grade = {
                    studentId: gradeData.studentId,
                    term: gradeData.term,
                    subject: gradeData.subject,
                    ca1: null, ca2: null, ca3: null, exam: null, total: 0, remarks: ''
                };
                state.grades.push(grade);
            }

            Object.assign(grade, gradeData);

            // Recalculate total
            grade.total = (grade.ca1 || 0) + (grade.ca2 || 0) + (grade.ca3 || 0) + (grade.exam || 0);

            this._set('smartschool_grades', state.grades);
        }) as Promise<void>;
    },

    addQuestionToBank(question: Omit<ManualQuestion, 'id'>): Promise<ManualQuestion> {
        return this._simulateNetwork(() => {
            const newQuestion: ManualQuestion = { ...question, id: 'Q-' + Date.now() };
            state.questionBank.unshift(newQuestion);
            this._set('smartschool_questionbank', state.questionBank);
            return newQuestion;
        }) as Promise<ManualQuestion>;
    },
    
    removeQuestionFromBank(id: string): Promise<void> {
        return this._simulateNetwork(() => {
            state.questionBank = state.questionBank.filter(q => q.id !== id);
            this._set('smartschool_questionbank', state.questionBank);
        }) as Promise<void>;
    },
    
    teacherLogin(schoolCode: string, staffId: string): Promise<Staff | null> {
         return this._simulateNetwork(() => {
            if (schoolCode !== VALID_SCHOOL_CODE) return null;
            const user = state.staff.find(s => s.id === staffId);
            if (user) {
                user.lastSeen = new Date().toLocaleString();
                this._set('smartschool_staff', state.staff);
                state.currentUser = user;
                this._set('smartschool_currentUser', state.currentUser);
                return user;
            }
            return null;
        }) as Promise<Staff | null>;
    },
    
    studentLogin(studentId: string, accessCode: string): Promise<Student | null> {
        return this._simulateNetwork(() => {
            const codeIsValid = state.accessCodes.some(c => c.studentId === studentId && c.code === accessCode);
            if (!codeIsValid) return null;
            
            const student = state.students.find(s => s.id === studentId);
            if (student) {
                state.currentStudent = student;
                this._set('smartschool_currentStudent', state.currentStudent);
                return student;
            }
            return null;
        }) as Promise<Student | null>;
    },
    
    parentLogin(parentId: string, accessCode: string): Promise<Parent | null> {
        return this._simulateNetwork(() => {
            const codeIsValid = state.parentAccessCodes.some(c => c.parentId === parentId && c.code === accessCode);
            if (!codeIsValid) return null;
            
            const parent = state.parents.find(p => p.id === parentId);
            if (parent) {
                state.currentParent = parent;
                this._set('smartschool_currentParent', state.currentParent);
                return parent;
            }
            return null;
        }) as Promise<Parent | null>;
    },


    logout(): Promise<void> {
        return this._simulateNetwork(() => {
            state.currentUser = null;
            state.currentStudent = null;
            state.currentParent = null;
            state.activeChat = null;
            state.chatHistory = [];
            this._set('smartschool_currentUser', null);
            this._set('smartschool_currentStudent', null);
            this._set('smartschool_currentParent', null);
        }) as Promise<void>;
    }
};

// =================================================================
// --- DOM UTILITIES
// =================================================================

/**
 * Creates an HTML element.
 * @param tag The HTML tag name.
 * @param attributes A key-value object of attributes and properties.
 * @param children An array of child nodes or strings.
 * @returns The created HTMLElement.
 */
const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: Partial<CSSStyleDeclaration>, [key: string]: any } = {},
    children: (Node | string | null | undefined)[] = []
): HTMLElementTagNameMap[K] => {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key in element) {
            try {
                (element as any)[key] = value;
            } catch (e) {
                element.setAttribute(key, value);
            }
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, String(value));
        }
    });

    children.forEach(child => {
        if (child === null || child === undefined) return;
        element.append(typeof child === 'string' ? document.createTextNode(child) : child);
    });

    return element;
};

/**
 * A helper to clear a container and append new children.
 * @param container The container element.
 * @param children The children to append.
 */
const renderChildren = (container: HTMLElement | null, children: (Node | string)[]) => {
    if (!container) return;
    container.innerHTML = '';
    children.forEach(child => {
         if (child === null || child === undefined) return;
         container.append(typeof child === 'string' ? document.createTextNode(child) : child);
    });
};

/**
 * A very simple Markdown to DOM nodes converter.
 * Supports **bold** and newlines.
 * @param text The markdown text.
 * @returns An array of nodes.
 */
const simpleMarkdownToNodes = (text: string): Node[] => {
    const fragment = document.createDocumentFragment();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        if (index > 0) {
            fragment.appendChild(el('br'));
        }
        // Split by **bold** tags, keeping the delimiters
        const parts = line.split(/(\*\*.*?\*\*)/g).filter(p => p);
        
        parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                fragment.appendChild(el('strong', {}, [part.slice(2, -2)]));
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });
    });
    return Array.from(fragment.childNodes);
};

// =================================================================
// --- UI / RENDERING
// =================================================================

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = el('div', { className: `toast toast-${type}` });
    // Using innerHTML here is acceptable as the message is controlled internally
    // and may contain simple HTML like <br> or <strong>.
    toast.innerHTML = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
};

const showSpinner = (containerSelector: string) => {
    const spinner = document.querySelector(`${containerSelector} .spinner-overlay`);
    if(spinner) (spinner as HTMLElement).style.display = 'flex';
}
const hideSpinner = (containerSelector: string) => {
    const spinner = document.querySelector(`${containerSelector} .spinner-overlay`);
    if(spinner) (spinner as HTMLElement).style.display = 'none';
}

const updateSidebarAccess = () => {
    const adminLink = document.querySelector('.nav-link[data-section="admin"]')?.parentElement;
    const analyticsLink = document.querySelector('.nav-link[data-section="analytics"]')?.parentElement;
    if (!adminLink || !analyticsLink) return;

    if (state.currentUser && state.currentUser.role === 'Administrator') {
        (adminLink as HTMLElement).style.display = 'block';
        (analyticsLink as HTMLElement).style.display = 'block';
    } else {
        (adminLink as HTMLElement).style.display = 'none';
        (analyticsLink as HTMLElement).style.display = 'none';
    }
};

const populateClassSelector = (selector: string) => {
    const select = document.querySelector(selector) as HTMLSelectElement;
    if (!select) return;
    const classes = [...new Set(state.students.map(s => s.class))].sort();
    const originalValue = select.value;
    select.innerHTML = '';
    select.appendChild(el('option', { value: '', textContent: '-- Select Class --' }));
    classes.forEach(className => {
        select.appendChild(el('option', { value: className, textContent: className }));
    });
    if (originalValue) select.value = originalValue;
};

const populateStudentSelectors = (selector: string | null = null, filter: string = '') => {
    const selectors = selector ? [selector] : [
        '#results-student-select',
        '#report-student-select',
        '#progress-student-select'
    ];

    const filteredStudents = state.students
        .filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a,b) => a.name.localeCompare(b.name));

    selectors.forEach(sel => {
        const select = document.querySelector(sel) as HTMLSelectElement;
        if (!select) return;

        const originalValue = select.value;
        select.innerHTML = '';
        select.appendChild(el('option', { value: '', textContent: '-- Select a Student --' }));
        filteredStudents.forEach(student => {
             select.appendChild(el('option', { value: student.id, textContent: `${student.name} (${student.id})`}));
        });
        
        if (originalValue) select.value = originalValue;
    });
};

const populateRecordOfWorkTeacherSelector = () => {
    const select = document.getElementById('record-teacher-select') as HTMLSelectElement;
    if (!select) return;
    const teachers = state.staff.filter(s => s.role !== 'Administrator').sort((a, b) => a.name.localeCompare(b.name));
    select.innerHTML = '';
    select.appendChild(el('option', { value: '', textContent: '-- Select Teacher --' }));
    teachers.forEach(teacher => {
        select.appendChild(el('option', { value: teacher.id, textContent: `${teacher.name} (${teacher.role})`}));
    });
};

const renderQuestionBank = (filter = '') => {
    const container = document.getElementById('question-bank-list');
    if (!container) return;

    const lcf = filter.toLowerCase();
    const filteredQuestions = filter ? state.questionBank.filter(q => {
        if (q.type === 'mcq' || q.type === 'text') {
            return q.content.toLowerCase().includes(lcf);
        }
        if (q.fileName) {
            return q.fileName.toLowerCase().includes(lcf);
        }
        return false;
    }) : state.questionBank;


    if (filteredQuestions.length === 0) {
        renderChildren(container, [ el('p', { className: 'placeholder-text' }, ['No questions in the bank yet. Add one above!']) ]);
        return;
    }

    const questionElements = filteredQuestions.map(q => {
        let contentChildren: (Node | string)[] = [];
        switch(q.type) {
            case 'mcq':
                contentChildren = [
                    el('p', {}, [el('strong', {}, ['Question: ']), q.content]),
                    el('ul', {}, q.options?.map(o => el('li', { style: { fontWeight: o === q.answer ? 'bold' : 'normal', color: o === q.answer ? '#2d5a27' : 'inherit' } }, [o])) || [])
                ];
                break;
            case 'text':
                 contentChildren = [el('p', {}, [el('strong', {}, ['Question: ']), q.content])];
                 break;
            case 'image':
                contentChildren = [
                    el('p', {}, [`Image Question: ${q.fileName || 'Captured Image'}`]),
                    el('img', { src: q.content, alt: 'Question Image', style: { maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '5px' } })
                ];
                break;
            case 'pdf':
                contentChildren = [
                    el('p', {}, [
                        'PDF Question: ',
                        el('a', { href: q.content, target: '_blank' }, [q.fileName || 'View PDF'])
                    ])
                ];
                break;
        }

        return el('div', { className: 'question-bank-item' }, [
            el('div', { className: 'question-content' }, [
                el('span', { className: 'badge' }, [q.type.toUpperCase()]),
                ...contentChildren
            ]),
            el('div', { className: 'question-actions' }, [
                el('button', { className: 'btn btn-danger remove-question-btn', 'data-id': q.id }, ['Delete'])
            ])
        ]);
    });
    
    renderChildren(container, questionElements);
};

const showContent = (section: string) => {
    if ((section === 'admin' || section === 'analytics') && state.currentUser?.role !== 'Administrator') {
        showToast('You do not have permission to access this page.', 'error');
        showContent('dashboard'); // Redirect to dashboard
        return;
    }
    
    const titles: { [key: string]: string } = {
        'dashboard': 'Dashboard',
        'classroom': 'Virtual Classroom',
        'assessment': 'Assessment Center',
        'examination': 'Online Examination',
        'admin': 'Admin Panel',
        'records': 'Record of Work',
        'results': 'Results Access',
        'scheme': 'Scheme of Work',
        'tuition': 'Tuition Management',
        'progress': 'Progress Tracker',
        'timetable': 'Timetable Generator',
        'reports': 'Report Cards',
        'analytics': 'Analytics Dashboard',
    };
    if (pageTitle) pageTitle.textContent = titles[section] || 'Dashboard';

    tabContents.forEach(content => {
        (content.id === section) ? content.classList.add('active') : content.classList.remove('active');
    });

    navLinks.forEach(link => {
        const linkSection = (link as HTMLElement).dataset.section;
        linkSection === section ? link.classList.add('active') : link.classList.remove('active');
    });

    if (section === 'records') populateRecordOfWorkTeacherSelector();
    if (section === 'progress' || section === 'results' || section === 'reports') populateStudentSelectors();
    if (section === 'examination') {
         populateClassSelector('#exam-class-select');
    }
    if (section === 'classroom') {
        populateClassSelector('#assessment-sheet-class');
        populateClassSelector('#essay-class-select');
        renderEssayAssignmentSelector();
        renderEssaySubmissionsList((document.getElementById('essay-assignment-select') as HTMLSelectElement)?.value);
    }
    if (section === 'assessment') {
        renderQuestionBank();
    }
    if (section === 'admin') {
        renderStaffActivity();
        renderParentManagement();
    }
    if(section === 'analytics') {
        renderAnalyticsDashboard();
    }
};

const updateAppView = () => {
    if (state.currentUser) {
        teacherApp?.classList.remove('hidden');
        loginPage?.classList.add('hidden');
        studentPortal?.classList.add('hidden');
        parentPortal?.classList.add('hidden');
        updateSidebarAccess();
        showContent('dashboard');
    } else if (state.currentStudent) {
        teacherApp?.classList.add('hidden');
        loginPage?.classList.add('hidden');
        studentPortal?.classList.remove('hidden');
        parentPortal?.classList.add('hidden');
    } else if (state.currentParent) {
        teacherApp?.classList.add('hidden');
        loginPage?.classList.add('hidden');
        studentPortal?.classList.add('hidden');
        parentPortal?.classList.remove('hidden');
    }
    else {
        teacherApp?.classList.add('hidden');
        loginPage?.classList.remove('hidden');
        studentPortal?.classList.add('hidden');
        parentPortal?.classList.add('hidden');
    }
};

const toggleSidebar = () => sidebar?.classList.toggle('open');

const generateAccessCode = (id: string, type: 'student' | 'parent') => {
    const code = 'SMS-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 4).toUpperCase();
    
    if (type === 'student') {
        state.accessCodes = state.accessCodes.filter(c => c.studentId !== id);
        state.accessCodes.push({ studentId: id, code });
        api._set('smartschool_accesscodes', state.accessCodes);
    } else {
        state.parentAccessCodes = state.parentAccessCodes.filter(c => c.parentId !== id);
        state.parentAccessCodes.push({ parentId: id, code });
        api._set('smartschool_parentaccesscodes', state.parentAccessCodes);
    }

    if (type === 'student') {
        const generatedCodeEl = document.getElementById('generatedCode');
        const accessCodeDisplayEl = document.getElementById('accessCodeDisplay');
        if (generatedCodeEl) generatedCodeEl.textContent = code;
        if (accessCodeDisplayEl) accessCodeDisplayEl.style.display = 'block';
    } else {
        showToast(`Access code for parent ${id} is: ${code}`, 'success');
    }
};

const renderAll = () => {
    renderStaff();
    renderStudents();
    renderParentManagement();
    renderAnnouncements();
    renderSchemes();
    renderRecordsOfWork();
    populateClassSelector('#attendance-class-select');
    populateStudentSelectors();
    renderTuition();
    renderExaminations();
    renderEssayAssignmentSelector();
    renderQuestionBank();
    renderStaffActivity();
}

const renderStaff = (filter = '') => {
    // FIX: Cast querySelector result to HTMLElement for compatibility with renderChildren.
    const staffTableBody = document.querySelector<HTMLElement>('#staff-table tbody');
    if (!staffTableBody) return;

    const filteredStaff = state.staff
        .filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a,b) => a.name.localeCompare(b.name));
    
    const rows = filteredStaff.map(s => el('tr', { 'data-id': s.id }, [
        el('td', {}, [s.id]),
        el('td', {}, [s.name]),
        el('td', {}, [s.role]),
        el('td', {}, [el('button', { className: 'btn btn-danger remove-staff-btn' }, ['Remove'])])
    ]));

    renderChildren(staffTableBody, rows);
};

const renderStudents = (filter = '') => {
    // FIX: Cast querySelector result to HTMLElement for compatibility with renderChildren.
    const studentTableBody = document.querySelector<HTMLElement>('#student-table tbody');
    if (!studentTableBody) return;

     const filteredStudents = state.students
        .filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a,b) => a.name.localeCompare(b.name));

    const rows = filteredStudents.map(s => el('tr', { 'data-id': s.id }, [
        el('td', {}, [s.id]),
        el('td', {}, [s.name]),
        el('td', {}, [s.class]),
        el('td', {}, [el('button', { className: 'btn btn-danger remove-student-btn' }, ['Remove'])])
    ]));

    renderChildren(studentTableBody, rows);
};

const renderParentManagement = (filter = '') => {
    // FIX: Cast querySelector result to HTMLElement for compatibility with renderChildren.
    const parentTableBody = document.querySelector<HTMLElement>('#parent-table tbody');
    if (!parentTableBody) return;

    const filteredParents = state.parents
        .filter(p => p.name.toLowerCase().includes(filter?.toLowerCase() || ''))
        .sort((a,b) => a.name.localeCompare(b.name));

    const rows = filteredParents.map(p => el('tr', { 'data-id': p.id }, [
        el('td', {}, [p.id]),
        el('td', {}, [p.name]),
        el('td', {}, [p.studentIds.join(', ')]),
        el('td', { className: 'action-cell' }, [
            el('button', { className: 'btn-secondary-small generate-parent-code-btn' }, ['Code']),
            el('button', { className: 'btn btn-danger remove-parent-btn' }, ['Remove'])
        ])
    ]));
    
    renderChildren(parentTableBody, rows);
};

const createAnnouncementElements = (announcements: Announcement[]): HTMLElement[] => {
    if (announcements.length === 0) {
        return [el('p', {}, ['No announcements yet.'])];
    }
    return announcements.map(a => el('div', { className: 'announcement-card' }, [
        el('p', { textContent: a.text }),
        el('div', { className: 'timestamp', textContent: a.date })
    ]));
};

const renderAnnouncements = () => {
    const announcementList = document.getElementById('announcement-list');
    const announcementElements = createAnnouncementElements(state.announcements);
    renderChildren(announcementList, announcementElements);
    renderChildren(studentAnnouncementList, announcementElements.map(e => e.cloneNode(true) as HTMLElement));
};

const renderSchemes = () => {
    const schemeList = document.getElementById('scheme-list');
    if (!schemeList) return;

    if (state.schemes.length === 0) {
        renderChildren(schemeList, [el('p', {}, ['No schemes submitted yet.'])]);
        return;
    }

    const schemeElements = state.schemes.map(s => el('div', { className: 'scheme-item' }, [
        el('h5', {}, [`${s.subject} - ${s.term}`]),
        el('p', {}, [s.details])
    ]));

    renderChildren(schemeList, schemeElements);
};

const renderRecordsOfWork = () => {
    const recordList = document.getElementById('record-list');
    if (!recordList) return;

    if (state.recordsOfWork.length === 0) {
        renderChildren(recordList, [el('p', {}, ['No records submitted yet.'])]);
        return;
    }
    
    const recordElements = state.recordsOfWork.map(r => el('div', { className: 'record-item' }, [
        el('h5', {}, [`${r.subject} - ${r.class} (Week: ${r.week.split('-W')[1]})`]),
        el('p', {}, [el('strong', {}, ['Topics: ']), r.topics]),
        el('p', {}, [el('strong', {}, ['Assessment: ']), r.assessment || 'N/A']),
        el('div', { className: 'record-meta' }, [
            el('span', {}, ['Submitted by: ', el('strong', {}, [r.teacherName])]),
            el('span', {}, [`On: ${r.dateSubmitted}`])
        ])
    ]));
    
    renderChildren(recordList, recordElements);
};

const renderTuition = (filter = '') => {
    // FIX: Cast querySelector result to HTMLElement for compatibility with renderChildren.
    const tuitionTableBody = document.querySelector<HTMLElement>('#tuition-table tbody');
    if (!tuitionTableBody) return;

    const filteredStudents = state.students
        .filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a,b) => a.name.localeCompare(b.name));

    const rows = filteredStudents.map(student => {
        const record = state.tuitionRecords.find(t => t.studentId === student.id);
        if (!record) return null;
        
        const statusClass = record.status === 'Paid' ? 'status-paid' : 'status-owing';
        const actionButton = record.status === 'Owing' 
            ? el('button', { className: 'btn process-payment-btn', 'data-student-id': student.id }, ['Process Payment'])
            : el('span', {}, ['Paid']);
        
        return el('tr', { 'data-id': student.id }, [
            el('td', {}, [student.id]),
            el('td', {}, [student.name]),
            el('td', {}, [student.class]),
            el('td', {}, [el('span', { className: `status-badge ${statusClass}` }, [record.status])]),
            el('td', {}, [actionButton])
        ]);
    }).filter(Boolean) as HTMLElement[];
    
    renderChildren(tuitionTableBody, rows);
};

const createExamElements = (exams: Examination[], isStudentView: boolean): HTMLElement[] => {
     if (exams.length === 0) {
        return [el('p', {}, [isStudentView ? 'No examinations assigned to your class yet.' : 'No examinations created yet.'])];
    }

    return exams.map(exam => {
        let actionElements: HTMLElement[];
        if (isStudentView) {
            const completed = state.completedExams.find(c => c.examId === exam.id && c.studentId === state.currentStudent?.id);
            actionElements = completed
                ? [
                    el('span', { className: 'score-display' }, [`Score: ${completed.scaledScore.toFixed(1)}/70`]),
                    el('button', { className: 'btn btn-info', disabled: true }, ['Completed'])
                  ]
                : [el('button', { className: 'btn btn-info view-exam-btn' }, ['Take Exam'])];
        } else {
            const monitorBtn = el('button', { className: 'btn btn-secondary monitor-exam-btn' }, ['Monitor']);
            // FIX: Add event listener for the monitor button.
            monitorBtn.addEventListener('click', () => showProctoringModal(exam.id));

            actionElements = [
                monitorBtn,
                el('button', { className: 'btn btn-info view-exam-btn' }, ['View']),
                el('button', { className: 'btn btn-danger remove-exam-btn' }, ['Delete'])
            ];
        }

        return el('div', { className: 'exam-item', 'data-id': exam.id }, [
            el('div', { className: 'exam-item-info' }, [
                el('h5', {}, [isStudentView ? `${exam.title} (${exam.subject})` : exam.title]),
                el('p', {}, [isStudentView ? `Questions: ${exam.questions.length} | Duration: ${exam.duration} mins` : `For: ${exam.className} | Questions: ${exam.questions.length}`])
            ]),
            el('div', { className: 'exam-item-actions' }, actionElements)
        ]);
    });
};


const renderExaminations = () => {
    const examListContainer = document.getElementById('exam-list');
    const teacherExamElements = createExamElements(state.examinations, false);
    renderChildren(examListContainer, teacherExamElements);
    
    if (state.currentStudent && studentExamList) {
        renderStudentPortal();
    }
};

const renderEssayAssignmentSelector = () => {
    const select = document.getElementById('essay-assignment-select') as HTMLSelectElement;
    if (!select) return;

    const assignments = state.essayAssignments.sort((a, b) => a.title.localeCompare(b.title));
    const originalValue = select.value;
    select.innerHTML = '';
    select.appendChild(el('option', { value: '' }, ['-- Select an Assignment --']));
    
    assignments.forEach(assignment => {
        select.appendChild(el('option', { value: assignment.id, textContent: `${assignment.title} (${assignment.className})`}));
    });

    if (originalValue) select.value = originalValue;
};

const renderEssaySubmissionsList = (assignmentId: string) => {
    const container = document.getElementById('essay-submissions-container');
    if (!container) return;

    if (!assignmentId) {
        renderChildren(container, [el('p', { className: 'placeholder-text' }, ['Select an assignment to view submissions.'])]);
        return;
    }

    const submissions = state.essaySubmissions
        .filter(s => s.assignmentId === assignmentId)
        .sort((a, b) => a.studentName.localeCompare(b.studentName));
        
    const assignment = state.essayAssignments.find(a => a.id === assignmentId);
    const studentsInClass = state.students.filter(s => s.class === assignment?.className);
    
    if (studentsInClass.length === 0) {
        renderChildren(container, [el('p', { className: 'placeholder-text' }, ['No students in the assigned class.'])]);
        return;
    }

    const submissionElements = studentsInClass.map(student => {
        const submission = submissions.find(s => s.studentId === student.id);
        const statusElement = submission
            ? submission.score !== undefined
                ? el('span', { className: 'status graded' }, [`Graded: ${submission.score}/100`])
                : el('span', { className: 'status submitted' }, ['Submitted'])
            : el('span', { className: 'status pending' }, ['Not Submitted']);
        
        const actionButton = submission 
            ? el('button', { className: 'btn btn-secondary view-essay-btn', 'data-assignment-id': assignmentId, 'data-student-id': student.id }, ['View & Grade'])
            : el('button', { className: 'btn btn-secondary', disabled: true }, ['View']);

        return el('div', { className: 'submission-item' }, [
            el('div', { className: 'submission-info' }, [
                el('span', { className: 'student-name' }, [student.name]),
                statusElement
            ]),
            el('div', { className: 'submission-actions' }, [actionButton])
        ]);
    });
    
    renderChildren(container, submissionElements);
};

const renderAnalyticsDashboard = () => {
    const container = document.getElementById('analytics-dashboard-content');
    if (!container) return;

    // 1. Key Metrics
    const totalStudents = state.students.length;
    const totalStaff = state.staff.filter(s => s.role !== 'Administrator').length;
    const totalClasses = [...new Set(state.students.map(s => s.class))].length;

    const totalAttendanceRecords = state.attendanceRecords.flatMap(ar => ar.records);
    const presentCount = totalAttendanceRecords.filter(r => r.status === 'Present').length;
    const attendanceRate = totalAttendanceRecords.length > 0 ? (presentCount / totalAttendanceRecords.length) * 100 : 0;
    
    const overallAverageScore = state.grades.length > 0
        ? state.grades.reduce((acc, g) => acc + g.total, 0) / state.grades.length
        : 0;
        
    const keyMetricsElements = [
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Total Students']), el('p', { className: 'stat' }, [totalStudents.toString()]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Total Teachers']), el('p', { className: 'stat' }, [totalStaff.toString()]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Total Classes']), el('p', { className: 'stat' }, [totalClasses.toString()]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Attendance Rate']), el('p', { className: 'stat' }, [`${attendanceRate.toFixed(1)}%`]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Avg. Score']), el('p', { className: 'stat' }, [`${overallAverageScore.toFixed(1)}%`]) ])
    ];

    // 2. Class Performance
    const classPerformance = [...new Set(state.students.map(s => s.class))].map(className => {
        const studentIdsInClass = state.students.filter(s => s.class === className).map(s => s.id);
        const gradesInClass = state.grades.filter(g => studentIdsInClass.includes(g.studentId));
        const avgScore = gradesInClass.length > 0
            ? gradesInClass.reduce((acc, g) => acc + g.total, 0) / gradesInClass.length
            : 0;
        return { className, avgScore };
    }).sort((a,b) => b.avgScore - a.avgScore);

    const classPerformanceElements = classPerformance.map(cp => 
        el('div', { className: 'bar-item' }, [
            el('div', { className: 'bar-label' }, [cp.className]),
            el('div', { className: 'bar-wrapper' }, [
                el('div', { className: 'bar', style: { width: `${cp.avgScore.toFixed(1)}%` }, title: `${cp.avgScore.toFixed(1)}%` })
            ]),
            el('div', { className: 'bar-value' }, [`${cp.avgScore.toFixed(1)}%`])
        ])
    );

    // Combine and render
    const fullDashboard = [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['School-Wide Analytics Dashboard']),
            el('p', { className: 'settings-description', style: { marginTop: '0' } }, ['An overview of key school metrics. Use this dashboard to identify trends and make data-driven decisions.'])
        ]),
        el('div', { style: { marginTop: '25px' } }, [
            el('div', { className: 'analytics-grid' }, keyMetricsElements)
        ]),
        el('div', { className: 'admin-grid-large', style: { marginTop: '25px' } }, [
            el('div', { className: 'analytics-card' }, [
                el('h4', {}, ['Class Performance (Overall Average)']),
                el('div', { className: 'bar-chart' }, classPerformanceElements)
            ]),
            el('div', { className: 'analytics-card' }, [
                el('h4', {}, ['AI-Powered: At-Risk Student Report']),
                el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '20px' } }, ['Use AI to analyze school-wide grade and attendance data to generate a concise report identifying students who may be falling behind, allowing for early and effective intervention.']),
                el('button', { id: 'generate-at-risk-report-btn', className: 'btn btn-secondary', style: { width: 'auto' } }, ['Generate Report']),
                el('div', { id: 'at-risk-spinner', className: 'spinner', style: { display: 'none', marginTop: '20px' } }),
                el('div', { id: 'analytics-at-risk-box', className: 'ai-summary-box', style: { marginTop: '20px', whiteSpace: 'pre-wrap' } }, ['Click "Generate Report" to get an AI analysis.'])
            ])
        ])
    ];

    renderChildren(container, fullDashboard);
};

const renderStudentPortal = () => {
    if (!state.currentStudent || !studentPortal) return;

    if (studentWelcomeMessage) studentWelcomeMessage.textContent = `Welcome, ${state.currentStudent.name.split(' ')[0]}`;
    if (studentAvatar) studentAvatar.textContent = state.currentStudent.name.charAt(0).toUpperCase();

    // Render announcements
    renderAnnouncements();
    
    // Render examinations for the student's class
    const studentExams = state.examinations.filter(exam => exam.className === state.currentStudent?.class);
    renderChildren(studentExamList, createExamElements(studentExams, true));

    // Render report card for student
    if (studentReportCardContainer) {
        const currentTerm = "Third Term"; // Example
        // FIX: 'renderReportCard' is not defined. It is now defined below.
        renderReportCard(state.currentStudent.id, currentTerm, '#student-report-card-container');
    }

    // Render essay assignments
    if(studentEssayList) {
        const studentAssignments = state.essayAssignments.filter(a => a.className === state.currentStudent?.class);
        if(studentAssignments.length > 0) {
            const assignmentElements = studentAssignments.map(assignment => {
                const submission = state.essaySubmissions.find(s => s.assignmentId === assignment.id && s.studentId === state.currentStudent?.id);
                const statusElement = submission 
                    ? el('span', { className: 'status graded' }, [`Submitted ${submission.score ? `(Score: ${submission.score})` : ''}`])
                    : el('span', { className: 'status pending' }, ['Pending']);

                return el('div', { className: 'essay-submission-item', 'data-assignment-id': assignment.id }, [
                    el('div', {}, [
                        el('span', { className: 'student-name' }, [assignment.title]),
                        statusElement
                    ]),
                     el('button', { className: 'btn btn-secondary view-essay-submission-btn', style: { width: 'auto', padding: '5px 10px', fontSize: '14px' } }, [
                        submission ? 'View' : 'Submit'
                    ])
                ]);
            });
             renderChildren(studentEssayList, assignmentElements);
        } else {
             renderChildren(studentEssayList, [el('p', {}, ['No essay assignments for your class yet.'])]);
        }
    }
};

const renderParentPortal = () => {
    if (!state.currentParent || !parentDashboardContainer) return;

    if (parentWelcomeMessage) parentWelcomeMessage.textContent = `Welcome, ${state.currentParent.name}`;
    if (parentAvatar) parentAvatar.textContent = state.currentParent.name.charAt(0).toUpperCase();

    const childCards = state.currentParent.studentIds.map(studentId => {
        const student = state.students.find(s => s.id === studentId);
        if (!student) return null;

        const termOrder = ["Third Term", "Second Term", "First Term"];
        let latestTerm = '';
        for (const term of termOrder) {
            if (state.grades.some(g => g.studentId === student.id && g.term === term)) {
                latestTerm = term;
                break;
            }
        }
        
        const grades = state.grades.filter(g => g.studentId === student.id && g.term === latestTerm);
        const gradesElements = grades.length > 0
            ? [el('ul', {}, grades.map(g => el('li', {}, [`${g.subject}: `, el('strong', {}, [`${g.total}%`])])))]
            : [el('p', {}, ['No grades for this term.'])];

        const attendance = { Present: 0, Absent: 0, Late: 0 };
        state.attendanceRecords.forEach(ar => {
            const record = ar.records.find(r => r.studentId === student.id);
            if(record) attendance[record.status]++;
        });

        const tuition = state.tuitionRecords.find(t => t.studentId === student.id);
        const tuitionStatusElement = el('p', {}, [
            'Status: ', 
            el('span', { className: `status-badge ${tuition?.status === 'Paid' ? 'status-paid' : 'status-owing'}` }, [tuition?.status || ''])
        ]);
        const tuitionAmountElement = (tuition?.status === 'Owing')
            ? el('p', {}, ['Amount Due: ', el('strong', {}, [`$${tuition.amount}`])])
            : null;

        return el('div', { className: 'parent-child-card', 'data-student-id': student.id }, [
            el('h4', {}, [student.name]),
            el('p', { className: 'child-class' }, [student.class]),
            el('div', { className: 'child-info-grid' }, [
                el('div', { className: 'child-info-item' }, [
                    el('h6', {}, [`Latest Grades (${latestTerm || 'N/A'})`]),
                    ...gradesElements
                ]),
                el('div', { className: 'child-info-item' }, [
                    el('h6', {}, ['Attendance Summary']),
                    el('ul', {}, [
                        el('li', {}, ['Present: ', el('strong', {}, [attendance.Present.toString()])]),
                        el('li', {}, ['Late: ', el('strong', {}, [attendance.Late.toString()])]),
                        el('li', {}, ['Absent: ', el('strong', {}, [attendance.Absent.toString()])]),
                    ])
                ]),
                 el('div', { className: 'child-info-item' }, [
                    el('h6', {}, ['Tuition Status']),
                    tuitionStatusElement,
                    tuitionAmountElement
                ])
            ])
        ]);
    }).filter(Boolean) as HTMLElement[];

    renderChildren(parentDashboardContainer, childCards);
};

const renderAttendanceList = (className: string) => {
    const container = document.getElementById('attendance-list-container');
    const saveBtn = document.getElementById('save-attendance-btn');
    if (!container || !saveBtn) return;

    const studentsInClass = state.students.filter(s => s.class === className);
    if (studentsInClass.length === 0) {
        renderChildren(container, [el('p', {}, ['No students in this class.'])]);
        saveBtn.style.display = 'none';
        return;
    }

    const today = new Date().toLocaleDateString();
    const todaysRecord = state.attendanceRecords.find(r => r.date === today && r.class === className);

    const attendanceItems = studentsInClass.map(student => {
        const studentStatus = todaysRecord?.records.find(r => r.studentId === student.id)?.status || 'Present';
        return el('div', { className: 'attendance-item', 'data-student-id': student.id }, [
            el('span', { className: 'student-name' }, [student.name]),
            el('div', { className: 'attendance-status-buttons' }, [
                el('button', { className: `present ${studentStatus === 'Present' ? 'active' : ''}`, 'data-status': 'Present' }, ['P']),
                el('button', { className: `late ${studentStatus === 'Late' ? 'active' : ''}`, 'data-status': 'Late' }, ['L']),
                el('button', { className: `absent ${studentStatus === 'Absent' ? 'active' : ''}`, 'data-status': 'Absent' }, ['A'])
            ])
        ]);
    });
    
    renderChildren(container, attendanceItems);
    saveBtn.style.display = 'block';

    document.querySelectorAll('.attendance-status-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            const parent = button.parentElement;
            if (!parent) return;
            parent.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
};

const getISOWeekString = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};


const renderStaffActivity = () => {
    // FIX: Cast querySelector result to HTMLElement for compatibility with renderChildren.
    const tableBody = document.querySelector<HTMLElement>('#staff-activity-table tbody');
    if (!tableBody) return;

    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekString = getISOWeekString(lastWeekDate);
    const currentWeekString = getISOWeekString(new Date());

    const sortedStaff = state.staff.sort((a,b) => a.name.localeCompare(b.name));

    const rows = sortedStaff.map(staff => {
        if (staff.role === 'Administrator') return null;

        const staffRecords = state.recordsOfWork.filter(r => r.teacherId === staff.id);
        const totalSubmissions = staffRecords.length;

        const hasSubmittedThisWeek = staffRecords.some(r => r.week === currentWeekString);
        const hasSubmittedLastWeek = staffRecords.some(r => r.week === lastWeekString);
        
        const statusElements = [];
        if (!hasSubmittedLastWeek) {
            statusElements.push(el('div', { className: 'status-item status-overdue' }, [el('strong', {}, ['Overdue: ']), `Work for week ${lastWeekString.split('-W')[1]}`]));
        }
        
        if (hasSubmittedThisWeek) {
            statusElements.push(el('div', { className: 'status-item status-submitted' }, [el('strong', {}, ['Submitted: ']), `Work for week ${currentWeekString.split('-W')[1]}`]));
        } else {
            statusElements.push(el('div', { className: 'status-item status-pending' }, [el('strong', {}, ['Pending: ']), `Work for week ${currentWeekString.split('-W')[1]}`]));
        }

        const hasOutstandingWork = !hasSubmittedLastWeek || !hasSubmittedThisWeek;

        const actionButton = hasOutstandingWork
            ? el('button', { className: 'btn-secondary-small send-reminder-btn', 'data-staff-id': staff.id }, ['Send Reminder'])
            : el('span', {}, ['All Caught Up!']);

        return el('tr', { 'data-id': staff.id }, [
            el('td', {}, [`${staff.name} (${staff.role})`]),
            el('td', {}, [staff.lastSeen]),
            el('td', {}, [totalSubmissions.toString()]),
            el('td', { className: 'submission-status-cell' }, statusElements),
            el('td', {}, [actionButton])
        ]);
    }).filter(Boolean) as HTMLElement[];

    renderChildren(tableBody, rows);
};

const updateHeader = () => {
    if (state.currentUser) {
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${state.currentUser.name.split(' ')[0]}`;
        if (userAvatar) userAvatar.textContent = state.currentUser.name.charAt(0).toUpperCase();
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        if (welcomeMessage) welcomeMessage.textContent = 'Welcome, Guest';
        if (userAvatar) userAvatar.textContent = 'G';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
};

// FIX: Add missing function definitions
//===========================================
// --- NEW FUNCTIONS TO FIX ERRORS ---
//===========================================

const getLetterGrade = (score: number): { grade: string; className: string } => {
    if (score >= 80) return { grade: 'A1', className: 'letter-grade-a1' };
    if (score >= 70) return { grade: 'B2', className: 'letter-grade-b2' };
    if (score >= 65) return { grade: 'B3', className: 'letter-grade-b3' };
    if (score >= 60) return { grade: 'C4', className: 'letter-grade-c4' };
    if (score >= 55) return { grade: 'C5', className: 'letter-grade-c5' };
    if (score >= 50) return { grade: 'C6', className: 'letter-grade-c6' };
    if (score >= 45) return { grade: 'D7', className: 'letter-grade-d7' };
    if (score >= 40) return { grade: 'E8', className: 'letter-grade-e8' };
    return { grade: 'F9', className: 'letter-grade-f9' };
};

const renderReportCard = async (studentId: string, term: string, containerSelector: string) => {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) return;

    const student = state.students.find(s => s.id === studentId);
    if (!student) {
        renderChildren(container, [el('p', {}, ['Student not found.'])]);
        return;
    }

    const gradesForTerm = state.grades.filter(g => g.studentId === studentId && g.term === term);

    if (gradesForTerm.length === 0) {
        renderChildren(container, [el('p', { className: 'placeholder-text', style: { textAlign: 'center' } }, [`No grades available for ${term}.`])]);
        return;
    }

    const totalPoints = gradesForTerm.reduce((acc, g) => acc + g.total, 0);
    const average = totalPoints / gradesForTerm.length;

    const tableRows = gradesForTerm.map(g => {
        const letterGrade = getLetterGrade(g.total);
        return el('tr', {}, [
            el('td', {}, [g.subject]),
            el('td', {}, [g.ca1?.toString() || '-']),
            el('td', {}, [g.ca2?.toString() || '-']),
            el('td', {}, [g.ca3?.toString() || '-']),
            el('td', {}, [g.exam?.toString() || '-']),
            el('td', {}, [g.total.toFixed(1)]),
            el('td', {}, [el('span', { className: `letter-grade ${letterGrade.className}` }, [letterGrade.grade])]),
            el('td', {}, [g.remarks]),
        ]);
    });

    const reportCardElement = el('div', { className: 'report-card-content' }, [
        el('table', { className: 'report-card-table' }, [
            el('thead', {}, [
                el('tr', {}, [
                    el('th', {}, ['Subject']),
                    el('th', {}, ['CA1']),
                    el('th', {}, ['CA2']),
                    el('th', {}, ['CA3']),
                    el('th', {}, ['Exam']),
                    el('th', {}, ['Total']),
                    el('th', {}, ['Grade']),
                    el('th', {}, ['Remarks']),
                ])
            ]),
            el('tbody', {}, tableRows)
        ]),
        el('div', { className: 'report-summary' }, [
            el('p', {}, ['Overall Average: ', el('strong', {}, [`${average.toFixed(1)}%`])]),
        ])
    ]);
    renderChildren(container, [reportCardElement]);
};

const startStudentWebcam = async () => {
    const videoEl = document.getElementById('student-webcam-feed') as HTMLVideoElement;
    const placeholder = document.getElementById('student-webcam-placeholder');
    if (!videoEl || !placeholder) return;
    try {
        studentWebcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoEl.srcObject = studentWebcamStream;
        videoEl.style.display = 'block';
        placeholder.style.display = 'none';
    } catch (err) {
        console.error("Webcam access denied:", err);
        showToast("Webcam access is required for proctoring.", "error");
        hideViewExamModal();
    }
};

const stopStudentWebcam = () => {
    if (studentWebcamStream) {
        studentWebcamStream.getTracks().forEach(track => track.stop());
        studentWebcamStream = null;
    }
    const videoEl = document.getElementById('student-webcam-feed') as HTMLVideoElement;
    const placeholder = document.getElementById('student-webcam-placeholder');
    if (videoEl) videoEl.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
};

const startProctoringListeners = (studentId: string, examId: string) => {
    const onVisibilityChange = () => {
        if (document.hidden) {
            api.addProctoringFlag(studentId, examId, 'Tab switched or window minimized.');
        }
    };
    const onBlur = () => {
        api.addProctoringFlag(studentId, examId, 'Window lost focus.');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    activeExamProctoringListeners = () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        activeExamProctoringListeners = null;
    };
};

const submitAndGradeExam = async (examId: string) => {
    if (activeExamTimer) {
        clearInterval(activeExamTimer);
        activeExamTimer = null;
    }
    if (activeExamProctoringListeners) {
        activeExamProctoringListeners();
    }
    
    const exam = state.examinations.find(e => e.id === examId);
    const student = state.currentStudent;
    const form = document.getElementById('student-exam-form') as HTMLFormElement;
    if (!exam || !student || !form) {
        stopStudentWebcam();
        hideViewExamModal();
        return;
    };

    let score = 0;
    exam.questions.forEach((q, index) => {
        const selectedOption = form.querySelector(`input[name="question-${index}"]:checked`) as HTMLInputElement;
        if (selectedOption && selectedOption.value === q.answer) {
            score++;
        }
    });

    const scaledScore = (score / exam.questions.length) * 70;
    
    const completedExamIndex = state.completedExams.findIndex(c => c.examId === examId && c.studentId === student.id);
    if (completedExamIndex > -1) {
        state.completedExams[completedExamIndex].score = score;
        state.completedExams[completedExamIndex].scaledScore = scaledScore;
        api._set('smartschool_completedexams', state.completedExams);
    }
    
    renderExaminations();
    hideViewExamModal(); // This calls stopStudentWebcam implicitly
    showToast(`Exam submitted! Your score: ${scaledScore.toFixed(1)}/70`, 'success');
};

const startExamTimer = (durationMinutes: number, examId: string) => {
    const timerEl = document.getElementById('exam-timer');
    if (!timerEl) return;

    let totalSeconds = durationMinutes * 60;
    
    const updateTimer = () => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (totalSeconds <= 0) {
            submitAndGradeExam(examId);
            showToast('Time is up! Your exam has been submitted automatically.', 'info');
        } else {
            totalSeconds--;
        }
    };

    updateTimer();
    activeExamTimer = window.setInterval(updateTimer, 1000);
};

const handleExamSubmit = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const examId = form.dataset.examId;
    if (examId) {
        submitAndGradeExam(examId);
    }
};

const renderProctoringDashboard = (examId: string) => {
    // Re-render exam list on teacher's view to reflect that a student has started
    renderExaminations();
};

const renderLessonPlan = (plan: any) => {
    const resultsContainer = document.getElementById('plan-results-container');
    if (!resultsContainer || !plan) return;

    const objectivesElements = plan.learningObjectives.map((obj: string) => el('li', {}, [obj]));
    const breakdownElements = plan.weeklyBreakdown.map((week: { week: number, topic: string, activities: string[] }) => el('div', {}, [
        el('h5', {}, [`Week ${week.week}: ${week.topic}`]),
        el('ul', {}, week.activities.map((act: string) => el('li', {}, [act])))
    ]));
    const assessmentsElements = plan.assessmentMethods.map((method: string) => el('li', {}, [method]));

    const planElements = [
        el('h4', {}, [`Lesson Plan: ${plan.topic} for ${plan.gradeLevel}`]),
        el('h5', {}, ['Learning Objectives']),
        el('ul', {}, objectivesElements),
        ...breakdownElements,
        el('h5', {}, ['Assessment Methods']),
        el('ul', {}, assessmentsElements)
    ];
    renderChildren(resultsContainer, planElements);
};

const showProctoringModal = (examId: string) => {
    const exam = state.examinations.find(ex => ex.id === examId);
    if (!exam) return;

    const studentsInClass = state.students.filter(s => s.class === exam.className);
    const studentsTakingExam = state.completedExams.filter(c => c.examId === examId);

    const studentRows = studentsInClass.map(student => {
        const examRecord = studentsTakingExam.find(s => s.studentId === student.id);
        let status, flags;
        if (examRecord) {
            status = el('span', { className: 'status submitted' }, ['In Progress']);
            flags = examRecord.proctoringFlags.length > 0
                ? el('ul', {}, examRecord.proctoringFlags.map(f => el('li', {}, [`${f.timestamp}: ${f.event}`])))
                : el('span', {}, ['No flags']);
        } else {
            status = el('span', { className: 'status pending' }, ['Not Started']);
            flags = el('span', {}, ['-']);
        }
        return el('tr', {}, [
            el('td', {}, [student.name]),
            el('td', {}, [status]),
            el('td', {}, [flags])
        ]);
    });

    const modalContent = el('div', { className: 'modal-content', style: { maxWidth: '700px' } }, [
        el('button', { className: 'modal-close-btn' }, ['×']),
        el('h3', {}, [`Monitoring: ${exam.title}`]),
        el('table', { className: 'proctoring-table' }, [
            el('thead', {}, [el('tr', {}, [el('th', {}, ['Student']), el('th', {}, ['Status']), el('th', {}, ['Proctoring Flags'])])]),
            el('tbody', {}, studentRows)
        ])
    ]);
    
    const modal = el('div', { id: 'proctoring-modal', className: 'modal-overlay' }, [modalContent]);
    modal.querySelector('.modal-close-btn')!.addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
};

// =================================================================
// --- HANDLERS
// =================================================================

const handleAddStaff = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nameInput = document.getElementById('staff-name') as HTMLInputElement;
    const roleInput = document.getElementById('staff-role') as HTMLInputElement;
    if (!nameInput.value || !roleInput.value) return;

    showToast('Adding staff...', 'info');
    try {
        const newStaff = await api.addStaff(nameInput.value, roleInput.value);
        renderStaff();
        renderStaffActivity();
        showToast(`Staff '${newStaff.name}' added! <br><strong>ID: ${newStaff.id}</strong>`, 'success');
        form.reset();
    } catch (error) {
        showToast('Failed to add staff.', 'error');
    }
};

const handleRemoveStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    showToast('Removing staff...', 'info');
    try {
        await api.removeStaff(id);
        renderStaff();
        renderStaffActivity();
        showToast('Staff removed.', 'success');
    } catch (error) {
        showToast('Failed to remove staff.', 'error');
    }
};

const handleAddStudent = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nameInput = document.getElementById('student-name') as HTMLInputElement;
    const classInput = document.getElementById('student-class') as HTMLInputElement;
    if (!nameInput.value || !classInput.value) return;

    showToast('Adding student...', 'info');
    try {
        const newStudent = await api.addStudent(nameInput.value, classInput.value);
        renderStudents();
        renderTuition();
        populateClassSelector('#attendance-class-select');
        populateStudentSelectors();
        showToast(`Student '${newStudent.name}' added! <br><strong>ID: ${newStudent.id}</strong>`, 'success');
        form.reset();
    } catch (error) {
        showToast('Failed to add student.', 'error');
    }
};

const handleRemoveStudent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this student?')) return;
    showToast('Removing student...', 'info');
    try {
        await api.removeStudent(id);
        renderStudents();
        renderTuition();
        populateClassSelector('#attendance-class-select');
        populateStudentSelectors();
        showToast('Student removed.', 'success');
    } catch (error) {
        showToast('Failed to remove student.', 'error');
    }
};

const handleAddParent = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nameInput = document.getElementById('parent-name') as HTMLInputElement;
    const studentIdsInput = document.getElementById('parent-student-ids') as HTMLInputElement;
    if (!nameInput.value || !studentIdsInput.value) return;

    showToast('Adding parent...', 'info');
    try {
        const studentIds = studentIdsInput.value.split(',').map(id => id.trim());
        const newParent = await api.addParent(nameInput.value, studentIds);
        if (newParent) {
            renderParentManagement();
            showToast(`Parent '${newParent.name}' added! <br><strong>ID: ${newParent.id}</strong>`, 'success');
            form.reset();
        }
    } catch (error) {
        showToast('Failed to add parent.', 'error');
    }
};

const handleRemoveParent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this parent? This will not remove their children.')) return;
    showToast('Removing parent...', 'info');
    try {
        await api.removeParent(id);
        renderParentManagement();
        showToast('Parent removed.', 'success');
    } catch (error) {
        showToast('Failed to remove parent.', 'error');
    }
};


const handlePostAnnouncement = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const textInput = document.getElementById('announcement-text') as HTMLTextAreaElement;
    if (!textInput.value) return;
    
    showToast('Posting announcement...', 'info');
    try {
        await api.postAnnouncement(textInput.value);
        renderAnnouncements();
        showToast('Announcement posted!', 'success');
        form.reset();
    } catch (error) {
        showToast('Failed to post announcement.', 'error');
    }
};

const handleAddScheme = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const termSelect = document.getElementById('scheme-term') as HTMLSelectElement;
    const subjectInput = document.getElementById('scheme-subject') as HTMLInputElement;
    const detailsTextarea = document.getElementById('scheme-details') as HTMLTextAreaElement;
    
    if(!subjectInput.value || !detailsTextarea.value) return;

    showToast('Saving scheme...', 'info');
    try {
        await api.addScheme(termSelect.value, subjectInput.value, detailsTextarea.value);
        renderSchemes();
        showToast('Scheme saved successfully!', 'success');
        form.reset();
    } catch (error) {
        showToast('Failed to save scheme.', 'error');
    }
};

const handleSaveRecordOfWork = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const teacherSelect = document.getElementById('record-teacher-select') as HTMLSelectElement;
    const subjectInput = document.getElementById('record-subject') as HTMLInputElement;
    const classInput = document.getElementById('record-class') as HTMLInputElement;
    const weekInput = document.getElementById('record-week') as HTMLInputElement;
    const topicsInput = document.getElementById('record-topics') as HTMLTextAreaElement;
    const assessmentInput = document.getElementById('record-assessment') as HTMLTextAreaElement;

    if (!teacherSelect.value || !subjectInput.value || !classInput.value || !weekInput.value || !topicsInput.value) {
        showToast('Please fill all required fields.', 'error');
        return;
    }

    const recordData = {
        teacherId: teacherSelect.value,
        teacherName: teacherSelect.options[teacherSelect.selectedIndex].text,
        subject: subjectInput.value,
        class: classInput.value,
        week: weekInput.value,
        topics: topicsInput.value,
        assessment: assessmentInput.value,
    };
    
    showToast('Saving record...', 'info');
    try {
        await api.addRecordOfWork(recordData);
        renderRecordsOfWork();
        renderStaffActivity();
        showToast('Record of work saved successfully!', 'success');
        form.reset();
    } catch (error) {
        showToast('Failed to save record.', 'error');
    }
};

const handleTeacherLogin = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const schoolCodeInput = document.getElementById('login-school-code') as HTMLInputElement;
    const staffIdInput = document.getElementById('login-staff-id') as HTMLInputElement;
    const loginError = document.getElementById('teacher-login-error');
    
    const user = await api.teacherLogin(schoolCodeInput.value, staffIdInput.value);

    if (user) {
        updateHeader();
        renderAll();
        updateAppView();
        if (loginError) loginError.style.display = 'none';
        form.reset();
        showToast(`Welcome, ${user.name}!`, 'success');
    } else {
        if (loginError) {
            loginError.textContent = 'Invalid School Code or Staff ID. Please try again.';
            loginError.style.display = 'block';
        }
    }
};

const handleStudentLogin = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const studentIdInput = document.getElementById('login-student-id') as HTMLInputElement;
    const accessCodeInput = document.getElementById('login-access-code') as HTMLInputElement;
    const loginError = document.getElementById('student-login-error');

    const student = await api.studentLogin(studentIdInput.value, accessCodeInput.value);

    if(student) {
        renderStudentPortal();
        updateAppView();
        if (loginError) loginError.style.display = 'none';
        form.reset();
        showToast(`Welcome, ${student.name}!`, 'success');
    } else {
         if (loginError) {
            loginError.textContent = 'Invalid Student ID or Access Code. Please try again.';
            loginError.style.display = 'block';
        }
    }
};

const handleParentLogin = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const parentIdInput = document.getElementById('login-parent-id') as HTMLInputElement;
    const accessCodeInput = document.getElementById('login-parent-access-code') as HTMLInputElement;
    const loginError = document.getElementById('parent-login-error');

    const parent = await api.parentLogin(parentIdInput.value, accessCodeInput.value);

    if (parent) {
        renderParentPortal();
        updateAppView();
        if (loginError) loginError.style.display = 'none';
        form.reset();
        showToast(`Welcome, ${parent.name}!`, 'success');
    } else {
        if (loginError) {
            loginError.textContent = 'Invalid Parent ID or Access Code. Please try again.';
            loginError.style.display = 'block';
        }
    }
};



const handleLogout = async () => {
    await api.logout();
    updateHeader();
    updateAppView();
    showToast('You have been logged out.', 'info');
};

const handleProcessPayment = async (studentId: string) => {
    showToast('Processing payment...', 'info');
    try {
        await api.processTuitionPayment(studentId);
        renderTuition();
        showToast('Payment processed successfully!', 'success');
    } catch (error) {
        showToast('Failed to process payment.', 'error');
    }
};

const handleSaveAttendance = async () => {
    const className = (document.getElementById('attendance-class-select') as HTMLSelectElement).value;
    if (!className) return;

    const records: { studentId: string; status: 'Present' | 'Absent' | 'Late' }[] = [];
    document.querySelectorAll('.attendance-item').forEach(item => {
        const studentId = (item as HTMLElement).dataset.studentId;
        const activeBtn = item.querySelector('.attendance-status-buttons button.active');
        const status = (activeBtn ? (activeBtn as HTMLElement).dataset.status : 'Absent') as 'Present' | 'Absent' | 'Late';
        if (studentId && status) {
            records.push({ studentId, status });
        }
    });

    showToast('Saving attendance...', 'info');
    try {
        await api.saveAttendance(className, records);
        showToast(`Attendance for ${className} saved!`, 'success');
    } catch (error) {
        showToast('Failed to save attendance.', 'error');
    }
};

const handleSendReminder = (staffId: string) => {
    const staff = state.staff.find(s => s.id === staffId);
    if (staff) {
        showToast(`Reminder alert sent to ${staff.name}.`, 'success');
    }
};

const handleCreateEssay = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const titleInput = document.getElementById('essay-title') as HTMLInputElement;
    const classSelect = document.getElementById('essay-class-select') as HTMLSelectElement;
    const promptInput = document.getElementById('essay-prompt') as HTMLTextAreaElement;

    if (!titleInput.value || !classSelect.value || !promptInput.value) {
        showToast('Please fill all fields.', 'error');
        return;
    }

    await api.addEssayAssignment({
        title: titleInput.value,
        className: classSelect.value,
        prompt: promptInput.value,
    });
    
    renderEssayAssignmentSelector();
    showToast('Essay assignment created!', 'success');
    form.reset();
};

const updateResultsAccessView = (studentId: string) => {
    const statusContainer = document.getElementById('results-tuition-status');
    const statusText = document.getElementById('results-tuition-status-text');
    const generateBtn = document.getElementById('generate-access-code-btn') as HTMLButtonElement;
    const accessCodeDisplay = document.getElementById('accessCodeDisplay');

    if (!statusContainer || !statusText || !generateBtn || !accessCodeDisplay) return;

    const tuitionRecord = state.tuitionRecords.find(t => t.studentId === studentId);
    if (tuitionRecord) {
        statusText.textContent = tuitionRecord.status;
        statusContainer.style.display = 'flex';
        if (tuitionRecord.status === 'Paid') {
            generateBtn.disabled = false;
        } else {
            generateBtn.disabled = true;
        }
    } else {
        statusContainer.style.display = 'none';
        generateBtn.disabled = true;
    }
    accessCodeDisplay.style.display = 'none';
};

// --- Modal Handlers ---
const showApiKeyModal = () => {
    if (!apiKeyModal) return;
    apiKeyModal.style.display = 'flex';
    setTimeout(() => apiKeyModal.classList.add('visible'), 10);
};

const hideApiKeyModal = () => {
    if (!apiKeyModal) return;
    apiKeyModal.classList.remove('visible');
    setTimeout(() => {
        if (apiKeyModal) apiKeyModal.style.display = 'none';
    }, 300);
};

const handleSaveApiKey = () => {
    if (!apiKeyInput) return;
    const newKey = apiKeyInput.value.trim();
    if (newKey) {
        apiKey = newKey;
        localStorage.setItem('smartschool_apiKey', apiKey);
        showToast('API Key saved successfully!', 'success');
        hideApiKeyModal();
    } else {
        showToast('Please enter a valid API key.', 'error');
    }
};

const showViewExamModal = (examId: string) => {
    const exam = state.examinations.find(ex => ex.id === examId);
    if (!exam || !viewExamModal || !viewExamModalContent) return;

    if (state.currentStudent) { // Student taking exam
        const completed = state.completedExams.find(c => c.examId === examId && c.studentId === state.currentStudent!.id);
        if (completed) {
            showToast('You have already completed this exam.', 'info');
            return;
        }

        const proctorView = el('div', { id: 'student-proctor-view' }, [
            el('video', { id: 'student-webcam-feed', autoplay: true, playsinline: true, muted: true }),
            el('div', { id: 'student-webcam-placeholder' }, ['📸', el('br'), 'Proctoring Active'])
        ]);
        viewExamModal.appendChild(proctorView);
        // FIX: `startStudentWebcam` is not defined. It is now defined above.
        startStudentWebcam();
        // FIX: `startProctoringListeners` is not defined. It is now defined above.
        startProctoringListeners(state.currentStudent.id, exam.id);

        const questionElements = exam.questions.map((q, index) => {
            const optionElements = q.options.map((option: string) => 
                el('li', {}, [
                    el('label', {}, [
                        el('input', { type: 'radio', name: `question-${index}`, value: option, required: true }),
                        el('span', {}, [option])
                    ])
                ])
            );
            return el('div', { className: 'student-exam-question' }, [
                el('p', {}, [`${index + 1}. ${q.question}`]),
                el('ul', { className: 'student-exam-options' }, optionElements)
            ]);
        });

        const formElement = el('form', { id: 'student-exam-form', 'data-exam-id': exam.id }, [
            ...questionElements,
            el('button', { type: 'submit', id: 'submit-exam-btn', className: 'btn' }, ['Submit Exam'])
        ]);
        
        const modalChildren = [
            el('div', { id: 'student-exam-view' }, [
                 el('div', { id: 'exam-timer-container' }, [
                    el('div', { id: 'exam-timer' }, [`${String(exam.duration).padStart(2, '0')}:00`])
                 ]),
                 el('h3', {}, [exam.title]),
                 el('p', {}, [el('strong', {}, ['Instructions: ']), exam.instructions || 'Answer all questions. The exam will be submitted automatically when the timer runs out.']),
                 el('hr', { style: { margin: '15px 0' } }),
                 formElement
            ])
        ];
        renderChildren(viewExamModalContent, modalChildren);

        // FIX: `handleExamSubmit` is not defined. It is now defined above.
        formElement.addEventListener('submit', handleExamSubmit);
        // FIX: `startExamTimer` is not defined. It is now defined above.
        startExamTimer(exam.duration, exam.id);
        api.addCompletedExam({ studentId: state.currentStudent.id, examId: exam.id, score: 0, scaledScore: 0});
        // FIX: `renderProctoringDashboard` is not defined. It is now defined above.
        renderProctoringDashboard(exam.id); // Refresh teacher view

    } else { // Teacher view
        const questionElements = exam.questions.map((q, index) => {
            const optionElements = q.options.map((option: string) => 
                el('li', { style: { backgroundColor: option === q.answer ? '#d4edda' : 'inherit', borderLeft: option === q.answer ? '3px solid #155724' : 'none' } }, [option])
            );
            return el('div', { className: 'quiz-question' }, [
                el('p', {}, [el('strong', {}, [`${index + 1}. ${q.question}`])]),
                el('ul', { className: 'quiz-options' }, optionElements),
                el('p', { className: 'quiz-answer' }, [`Correct Answer: ${q.answer}`])
            ]);
        });

        const modalChildren = [
            el('h3', {}, [exam.title]),
            el('div', { className: 'exam-meta' }, [
                el('span', {}, [el('strong', {}, ['For: ']), exam.className]),
                el('span', {}, [el('strong', {}, ['Duration: ']), `${exam.duration} minutes`])
            ]),
            el('p', {}, [el('strong', {}, ['Instructions: ']), exam.instructions || 'N/A']),
            el('hr', { style: { margin: '15px 0' } }),
            ...questionElements
        ];
        renderChildren(viewExamModalContent, modalChildren);
    }

    viewExamModal.style.display = 'flex';
    setTimeout(() => viewExamModal.classList.add('visible'), 10);
};

const hideViewExamModal = () => {
    if (!viewExamModal) return;

    if (activeExamTimer) {
        if (confirm('Are you sure you want to close the exam? This will submit your answers as they are.')) {
            const form = document.getElementById('student-exam-form') as HTMLFormElement;
            // FIX: `submitAndGradeExam` is not defined. It is now defined above.
            if(form) submitAndGradeExam(form.dataset.examId!);
        } else {
            return;
        }
    }
    
    // FIX: `stopStudentWebcam` is not defined. It is now defined above.
    stopStudentWebcam();
    const proctorView = document.getElementById('student-proctor-view');
    if(proctorView) proctorView.remove();


    viewExamModal.classList.remove('visible');
    setTimeout(() => {
        if (viewExamModal) viewExamModal.style.display = 'none';
    }, 300);
};

const hideViewEssayModal = () => {
    if (!viewEssayModal) return;
    viewEssayModal.classList.remove('visible');
    setTimeout(() => {
        if (viewEssayModal) {
            viewEssayModal.style.display = 'none';
            if (viewEssayModalContent) viewEssayModalContent.innerHTML = '';
        }
    }, 300);
}

const hideCameraModal = () => {
    if (!cameraModal) return;
    if (cameraModalStream) {
        cameraModalStream.getTracks().forEach(track => track.stop());
        cameraModalStream = null;
    }
    cameraModal.classList.remove('visible');
    setTimeout(() => {
        if (cameraModal) cameraModal.style.display = 'none';
    }, 300);
};

// --- AI Features ---
const getAiClient = (): GoogleGenAI | null => {
    if (!apiKey) {
        showToast("Please set your Gemini API Key in the settings.", "error");
        showApiKeyModal();
        return null;
    }
    // FIX: Pass apiKey as an object property
    return new GoogleGenAI({ apiKey });
};

const handleGenerateQuiz = async () => {
    const generateQuizBtn = document.getElementById('generate-quiz-btn') as HTMLButtonElement;
    const quizSpinner = document.getElementById('quiz-spinner');
    const quizResultsContainer = document.getElementById('quiz-results-container');
    const quizTopicInput = document.getElementById('quiz-topic') as HTMLInputElement;
    const numQuestionsSelect = document.getElementById('num-questions') as HTMLSelectElement;

    if (!quizTopicInput?.value) {
        alert("Please enter a topic for the quiz.");
        return;
    }

    const ai = getAiClient();
    if (!ai) return;

    generateQuizBtn.disabled = true;
    if (quizSpinner) quizSpinner.style.display = 'block';
    if (quizResultsContainer) quizResultsContainer.innerHTML = '';

    const topic = quizTopicInput.value;
    const numQuestions = parseInt(numQuestionsSelect.value, 10);
    
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

        const jsonResponse = JSON.parse(response.text);
        renderQuiz(jsonResponse.quiz);

    } catch (error) {
        console.error("Error generating quiz:", error);
        if (quizResultsContainer) {
            renderChildren(quizResultsContainer, [el('p', { style: { color: 'red', textAlign: 'center' } }, ['Sorry, something went wrong. Please try again.'])]);
        }
    } finally {
        generateQuizBtn.disabled = false;
        if (quizSpinner) quizSpinner.style.display = 'none';
    }
};

const renderQuiz = (quiz: ExamQuestion[]) => {
    const quizResultsContainer = document.getElementById('quiz-results-container');
    if (!quizResultsContainer || !quiz) return;

    const quizElements = quiz.map((q, index) => {
        const optionElements = q.options.map((option: string) => 
            el('li', { style: { backgroundColor: option === q.answer ? '#d4edda' : 'inherit', borderLeft: option === q.answer ? '3px solid #155724' : 'inherit' } }, [option])
        );

        return el('div', { className: 'quiz-question' }, [
            el('p', {}, [el('strong', {}, [`${index + 1}. ${q.question}`])]),
            el('ul', { className: 'quiz-options' }, optionElements),
            el('p', { className: 'quiz-answer' }, [`Correct Answer: ${q.answer}`])
        ]);
    });

    renderChildren(quizResultsContainer, [
        el('h3', { style: { color: '#2d5a27', marginBottom: '15px' } }, ['Generated Quiz']),
        ...quizElements
    ]);
};

const handleGenerateLessonPlan = async () => {
    const generateBtn = document.getElementById('generate-plan-btn') as HTMLButtonElement;
    const spinner = document.getElementById('plan-spinner');
    const resultsContainer = document.getElementById('plan-results-container');
    const topicInput = document.getElementById('plan-topic') as HTMLInputElement;
    const gradeInput = document.getElementById('plan-grade') as HTMLInputElement;
    const weeksInput = document.getElementById('plan-weeks') as HTMLInputElement;

    // FIX: Complete the validation check and the rest of the function.
    if (!topicInput.value || !gradeInput.value || !weeksInput.value) {
        alert("Please fill in all fields for the lesson plan.");
        return;
    }
    
    const ai = getAiClient();
    if (!ai) return;

    generateBtn.disabled = true;
    if (spinner) spinner.style.display = 'block';
    if (resultsContainer) resultsContainer.innerHTML = '';

    const topic = topicInput.value;
    const grade = gradeInput.value;
    const weeks = weeksInput.value;
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

        const jsonResponse = JSON.parse(response.text);
        renderLessonPlan(jsonResponse.plan);
    } catch (error) {
        console.error("Error generating lesson plan:", error);
        if (resultsContainer) {
            renderChildren(resultsContainer, [el('p', { style: { color: 'red' } }, ['Failed to generate lesson plan. Please try again.'])]);
        }
    } finally {
        generateBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
};
