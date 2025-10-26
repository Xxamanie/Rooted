/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getState, setState } from './state.js';
import { showToast } from './ui/dom-utils.js';

// =================================================================
// --- API SERVICE (Simulated Backend)
// =================================================================

const _get = (key) => JSON.parse(localStorage.getItem(key) || 'null');
const _set = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const _simulateNetwork = (callback) => {
    return new Promise(resolve => {
        setTimeout(() => {
            const result = callback();
            resolve(result);
        }, getState().isLiveMode ? 800 : 0);
    });
};

export const api = {
    loadInitialState() {
        return _simulateNetwork(() => {
            const loadedState = {
                staff: _get('smartschool_staff') || [],
                students: _get('smartschool_students') || [],
                parents: _get('smartschool_parents') || [],
                announcements: _get('smartschool_announcements') || [],
                schemes: _get('smartschool_schemes') || [],
                recordsOfWork: _get('smartschool_recordsofwork') || [],
                attendanceRecords: _get('smartschool_attendance') || [],
                tuitionRecords: _get('smartschool_tuition') || [],
                examinations: _get('smartschool_examinations') || [],
                completedExams: _get('smartschool_completedexams') || [],
                essayAssignments: _get('smartschool_essayassignments') || [],
                essaySubmissions: _get('smartschool_essaysubmissions') || [],
                grades: _get('smartschool_grades') || [],
                accessCodes: _get('smartschool_accesscodes') || [],
                parentAccessCodes: _get('smartschool_parentaccesscodes') || [],
                questionBank: _get('smartschool_questionbank') || [],
                timetable: _get('smartschool_timetable') || null,
                tasks: _get('smartschool_tasks') || [],
                currentUser: _get('smartschool_currentUser') || null,
                currentStudent: _get('smartschool_currentStudent') || null,
                currentParent: _get('smartschool_currentParent') || null,
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
                const storageKey = `smartschool_${key.toString().toLowerCase()}`;
                if(_get(storageKey) === null) {
                    _set(storageKey, loadedState[key]);
                }
            });
            
            return loadedState;
        });
    },

    addStaff(name, role) {
        return _simulateNetwork(() => {
            const state = getState();
            const newStaff = { id: 'SID-' + Math.floor(1000 + Math.random() * 9000), name, role, lastSeen: 'Never' };
            const updatedStaff = [...state.staff, newStaff];
            _set('smartschool_staff', updatedStaff);
            setState({ staff: updatedStaff });
            return newStaff;
        });
    },
    
    removeStaff(id) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedStaff = state.staff.filter(s => s.id !== id);
            _set('smartschool_staff', updatedStaff);
            setState({ staff: updatedStaff });
        });
    },

    addStudent(name, className) {
        return _simulateNetwork(() => {
            const state = getState();
            const newStudent = { id: 'STU-' + Math.floor(1000 + Math.random() * 9000), name, class: className };
            const updatedStudents = [...state.students, newStudent];
            _set('smartschool_students', updatedStudents);

            const newTuitionRecord = { studentId: newStudent.id, status: 'Owing', amount: 500 };
            const updatedTuition = [...state.tuitionRecords, newTuitionRecord];
            _set('smartschool_tuition', updatedTuition);

            setState({ students: updatedStudents, tuitionRecords: updatedTuition });
            return newStudent;
        });
    },
    
    removeStudent(id) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedStudents = state.students.filter(s => s.id !== id);
            const updatedTuition = state.tuitionRecords.filter(t => t.studentId !== id);
            const updatedGrades = state.grades.filter(g => g.studentId !== id);

            _set('smartschool_students', updatedStudents);
            _set('smartschool_tuition', updatedTuition);
            _set('smartschool_grades', updatedGrades);
            
            setState({ students: updatedStudents, tuitionRecords: updatedTuition, grades: updatedGrades });
        });
    },

    addParent(name, studentIds) {
        return _simulateNetwork(() => {
            const state = getState();
            // Validate student IDs
            const validStudentIds = studentIds.filter(id => state.students.some(s => s.id === id));
            if (validStudentIds.length !== studentIds.length) {
                showToast('One or more student IDs are invalid.', 'error');
                return null;
            }
            const newParent = { id: 'PAR-' + Math.floor(100 + Math.random() * 900), name, studentIds: validStudentIds };
            const updatedParents = [...state.parents, newParent];
            _set('smartschool_parents', updatedParents);
            setState({ parents: updatedParents });
            return newParent;
        });
    },

    removeParent(id) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedParents = state.parents.filter(p => p.id !== id);
            _set('smartschool_parents', updatedParents);
            setState({ parents: updatedParents });
        });
    },
    
    postAnnouncement(text) {
        return _simulateNetwork(() => {
            const state = getState();
            const newAnnouncement = { text, date: new Date().toLocaleString() };
            const updatedAnnouncements = [newAnnouncement, ...state.announcements];
            _set('smartschool_announcements', updatedAnnouncements);
            setState({ announcements: updatedAnnouncements });
            return newAnnouncement;
        });
    },

    addScheme(term, subject, details) {
        return _simulateNetwork(() => {
            const state = getState();
            const newScheme = { term, subject, details };
            const updatedSchemes = [newScheme, ...state.schemes];
            _set('smartschool_schemes', updatedSchemes);
            setState({ schemes: updatedSchemes });
            return newScheme;
        });
    },

    addRecordOfWork(recordData) {
        return _simulateNetwork(() => {
            const state = getState();
            const newRecord = { ...recordData, dateSubmitted: new Date().toLocaleString() };
            const updatedRecords = [newRecord, ...state.recordsOfWork];
            _set('smartschool_recordsofwork', updatedRecords);
            setState({ recordsOfWork: updatedRecords });
            return newRecord;
        });
    },
    
    saveAttendance(className, records) {
        return _simulateNetwork(() => {
            const state = getState();
            const newRecord = { date: new Date().toLocaleDateString(), class: className, records };
            let updatedAttendance = state.attendanceRecords.filter(r => !(r.date === newRecord.date && r.class === newRecord.class));
            updatedAttendance.push(newRecord);
            _set('smartschool_attendance', updatedAttendance);
            setState({ attendanceRecords: updatedAttendance });
        });
    },
    
    processTuitionPayment(studentId) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedTuition = state.tuitionRecords.map(t => {
                if (t.studentId === studentId) {
                    return { ...t, status: 'Paid' };
                }
                return t;
            });
            _set('smartschool_tuition', updatedTuition);
            setState({ tuitionRecords: updatedTuition });
        });
    },
    
    addExamination(exam) {
        return _simulateNetwork(() => {
            const state = getState();
            const newExam = { ...exam, id: 'EXM-' + Date.now() };
            const updatedExams = [newExam, ...state.examinations];
            _set('smartschool_examinations', updatedExams);
            setState({ examinations: updatedExams });
            return newExam;
        });
    },

    removeExamination(id) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedExams = state.examinations.filter(ex => ex.id !== id);
            _set('smartschool_examinations', updatedExams);
            setState({ examinations: updatedExams });
        });
    },

    addCompletedExam(completedExam) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedCompletedExams = [...state.completedExams, {...completedExam, proctoringFlags: []}];
            _set('smartschool_completedexams', updatedCompletedExams);
            setState({ completedExams: updatedCompletedExams });
        });
    },

    addProctoringFlag(studentId, examId, event) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedCompletedExams = state.completedExams.map(c => {
                if (c.studentId === studentId && c.examId === examId) {
                    const newFlags = [...c.proctoringFlags, { timestamp: new Date().toLocaleTimeString(), event }];
                    return { ...c, proctoringFlags: newFlags };
                }
                return c;
            });
            _set('smartschool_completedexams', updatedCompletedExams);
            setState({ completedExams: updatedCompletedExams });
        });
    },

    addEssayAssignment(assignment) {
        return _simulateNetwork(() => {
            const state = getState();
            const newAssignment = { ...assignment, id: 'ESSAY-' + Date.now() };
            const updatedAssignments = [newAssignment, ...state.essayAssignments];
            _set('smartschool_essayassignments', updatedAssignments);
            setState({ essayAssignments: updatedAssignments });
            return newAssignment;
        });
    },

    addEssaySubmission(submission) {
        return _simulateNetwork(() => {
            const state = getState();
            const student = state.students.find(s => s.id === submission.studentId);
            if (!student) throw new Error("Student not found for submission");
            
            const newSubmission = { ...submission, studentName: student.name };
            // Remove previous submission if exists
            let updatedSubmissions = state.essaySubmissions.filter(s => !(s.assignmentId === newSubmission.assignmentId && s.studentId === newSubmission.studentId));
            updatedSubmissions.push(newSubmission);
            _set('smartschool_essaysubmissions', updatedSubmissions);
            setState({ essaySubmissions: updatedSubmissions });
            return newSubmission;
        });
    },
    
    updateEssayFeedback(assignmentId, studentId, feedback, score) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedSubmissions = state.essaySubmissions.map(s => {
                if (s.assignmentId === assignmentId && s.studentId === studentId) {
                    return { ...s, feedback, score };
                }
                return s;
            });
            _set('smartschool_essaysubmissions', updatedSubmissions);
            setState({ essaySubmissions: updatedSubmissions });
        });
    },


    updateGrade(gradeData) {
        return _simulateNetwork(() => {
            const state = getState();
            let gradeFound = false;
            let updatedGrades = state.grades.map(g => {
                if (g.studentId === gradeData.studentId && g.term === gradeData.term && g.subject === gradeData.subject) {
                    gradeFound = true;
                    const updatedGrade = { ...g, ...gradeData };
                    updatedGrade.total = (updatedGrade.ca1 || 0) + (updatedGrade.ca2 || 0) + (updatedGrade.ca3 || 0) + (updatedGrade.exam || 0);
                    return updatedGrade;
                }
                return g;
            });

            if (!gradeFound) {
                const newGrade = {
                    studentId: gradeData.studentId,
                    term: gradeData.term,
                    subject: gradeData.subject,
                    ca1: null, ca2: null, ca3: null, exam: null, total: 0, remarks: '',
                    ...gradeData
                };
                newGrade.total = (newGrade.ca1 || 0) + (newGrade.ca2 || 0) + (newGrade.ca3 || 0) + (newGrade.exam || 0);
                updatedGrades.push(newGrade);
            }

            _set('smartschool_grades', updatedGrades);
            setState({ grades: updatedGrades });
        });
    },

    addQuestionToBank(question) {
        return _simulateNetwork(() => {
            const state = getState();
            const newQuestion = { ...question, id: 'Q-' + Date.now() };
            const updatedBank = [newQuestion, ...state.questionBank];
            _set('smartschool_questionbank', updatedBank);
            setState({ questionBank: updatedBank });
            return newQuestion;
        });
    },
    
    removeQuestionFromBank(id) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedBank = state.questionBank.filter(q => q.id !== id);
            _set('smartschool_questionbank', updatedBank);
            setState({ questionBank: updatedBank });
        });
    },

    addTask(text) {
        return _simulateNetwork(() => {
            const state = getState();
            const newTask = { id: Date.now(), text, completed: false };
            const updatedTasks = [...state.tasks, newTask];
            _set('smartschool_tasks', updatedTasks);
            setState({ tasks: updatedTasks });
            return newTask;
        });
    },

    updateTaskStatus(id, completed) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedTasks = state.tasks.map(task => 
                task.id === id ? { ...task, completed } : task
            );
            _set('smartschool_tasks', updatedTasks);
            setState({ tasks: updatedTasks });
        });
    },

    removeTask(id) {
        return _simulateNetwork(() => {
            const state = getState();
            const updatedTasks = state.tasks.filter(task => task.id !== id);
            _set('smartschool_tasks', updatedTasks);
            setState({ tasks: updatedTasks });
        });
    },
    
    teacherLogin(schoolCode, staffId) {
         return _simulateNetwork(() => {
            const state = getState();
            const VALID_SCHOOL_CODE = 'SMRT-2024';
            if (schoolCode !== VALID_SCHOOL_CODE) return null;
            const user = state.staff.find(s => s.id === staffId);
            if (user) {
                const updatedUser = { ...user, lastSeen: new Date().toLocaleString() };
                const updatedStaff = state.staff.map(s => s.id === staffId ? updatedUser : s);
                _set('smartschool_staff', updatedStaff);
                _set('smartschool_currentUser', updatedUser);
                setState({ currentUser: updatedUser, staff: updatedStaff }, { rerender: true });
                return user;
            }
            return null;
        });
    },
    
    studentLogin(studentId, accessCode) {
        return _simulateNetwork(() => {
            const state = getState();
            const codeIsValid = state.accessCodes.some(c => c.studentId === studentId && c.code === accessCode);
            if (!codeIsValid) return null;
            
            const student = state.students.find(s => s.id === studentId);
            if (student) {
                _set('smartschool_currentStudent', student);
                setState({ currentStudent: student }, { rerender: true });
                return student;
            }
            return null;
        });
    },
    
    parentLogin(parentId, accessCode) {
        return _simulateNetwork(() => {
            const state = getState();
            const codeIsValid = state.parentAccessCodes.some(c => c.parentId === parentId && c.code === accessCode);
            if (!codeIsValid) return null;
            
            const parent = state.parents.find(p => p.id === parentId);
            if (parent) {
                _set('smartschool_currentParent', parent);
                setState({ currentParent: parent }, { rerender: true });
                return parent;
            }
            return null;
        });
    },


    logout() {
        return _simulateNetwork(() => {
            _set('smartschool_currentUser', null);
            _set('smartschool_currentStudent', null);
            _set('smartschool_currentParent', null);
            setState({
                currentUser: null,
                currentStudent: null,
                currentParent: null,
                activeChat: null,
                chatHistory: [],
            }, { rerender: true });
        });
    }
};