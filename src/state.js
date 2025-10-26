/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let state = {
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
    tasks: [],
    currentUser: null,
    currentStudent: null,
    currentParent: null,
    activeChat: null,
    chatHistory: [],
    apiKey: null,
    isLiveMode: false,
};

export const getState = () => {
    return state;
};

export const setState = (newState, options = { rerender: false }) => {
    state = { ...state, ...newState };
    
    // Dispatch a custom event to notify components of state changes
    document.dispatchEvent(new CustomEvent('state-change', { detail: options }));

    return state;
};