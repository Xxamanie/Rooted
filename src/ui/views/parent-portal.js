/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren } from "../dom-utils.js";
import { getState } from "../../state.js";
import { api } from "../../api.js";

export const renderParentPortal = () => {
    const state = getState();
    const { currentParent, students, grades, attendanceRecords, tuitionRecords } = state;
    
    if (!currentParent) return el('div', {}, ['Error: No parent logged in.']);
    
    const handleLogout = () => api.logout();

    const parentHeader = el('header', { className: 'header' }, [
        el('div', { className: 'header-left' }, [
            el('div', { className: 'logo-section', style: { border: 'none', margin: 0, padding: 0 } }, [
                el('span', { className: 'logo-text' }, ['Smart School Parent Portal'])
            ])
        ]),
        el('div', { className: 'header-right' }, [
            el('span', { className: 'header-welcome-text' }, [`Welcome, ${currentParent.name}`]),
            el('div', { className: 'user-avatar' }, [currentParent.name.charAt(0).toUpperCase()]),
            el('button', { className: 'btn logout-btn', title: 'Logout' }, ['Logout'])
        ])
    ]);
    parentHeader.querySelector('button[title="Logout"]').addEventListener('click', handleLogout);

    const childCards = currentParent.studentIds.map(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return null;

        const termOrder = ["Third Term", "Second Term", "First Term"];
        let latestTerm = '';
        for (const term of termOrder) {
            if (grades.some(g => g.studentId === student.id && g.term === term)) {
                latestTerm = term;
                break;
            }
        }
        
        const studentGrades = grades.filter(g => g.studentId === student.id && g.term === latestTerm);
        const gradesElements = studentGrades.length > 0
            ? [el('ul', {}, studentGrades.map(g => el('li', {}, [`${g.subject}: `, el('strong', {}, [`${g.total}%`])])))]
            : [el('p', {}, ['No grades for this term.'])];

        const attendance = { Present: 0, Absent: 0, Late: 0 };
        attendanceRecords.forEach(ar => {
            const record = ar.records.find(r => r.studentId === student.id);
            if(record) attendance[record.status]++;
        });

        const tuition = tuitionRecords.find(t => t.studentId === student.id);
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
    }).filter(Boolean);

    const parentDashboard = el('div', { id: 'parent-dashboard-container' }, childCards);

    const parentPortal = el('div', { id: 'parent-portal' }, [
        parentHeader,
        el('main', { className: 'parent-portal-view' }, [parentDashboard])
    ]);

    return parentPortal;
};