/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren } from "../dom-utils.js";
import { getState } from "../../state.js";
import { api } from "../../api.js";

export const renderParentPortal = () => {
    const state = getState();
    const { currentParent, students, grades, attendanceRecords, tuitionRecords, events } = state;
    
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
        const balance = (tuition?.amountBilled || 0) - (tuition?.amountPaid || 0);
        
        let statusText = 'Owing';
        let statusClass = 'status-owing';
        if (balance <= 0) {
            statusText = 'Paid';
            statusClass = 'status-paid';
        } else if ((tuition?.amountPaid || 0) > 0) {
            statusText = 'Partially Paid';
            statusClass = 'status-partially-paid';
        }
        
        const tuitionStatusElement = el('p', {}, [
            'Status: ', 
            el('span', { className: `status-badge ${statusClass}` }, [statusText])
        ]);
        const tuitionAmountElement = el('div', {className: 'tuition-details'}, [
            el('span', {}, ['Billed: ', el('strong', {}, [`$${tuition?.amountBilled || 0}`])]),
            el('span', {}, ['Paid: ', el('strong', {}, [`$${tuition?.amountPaid || 0}`])]),
            el('span', {}, ['Balance: ', el('strong', {}, [`$${balance}`])]),
        ]);

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

    // Upcoming Events
    const studentClasses = students.filter(s => currentParent.studentIds.includes(s.id)).map(s => s.class);
    const relevantEvents = events.filter(e => e.type === 'school' || studentClasses.includes(e.className))
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    const eventElements = relevantEvents.length > 0
        ? relevantEvents.map(event => {
            const date = new Date(event.date);
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();

            return el('div', {className: 'event-item'}, [
                el('div', {className: 'event-date'}, [
                    el('span', {className: 'month'}, [month]),
                    el('span', {className: 'day'}, [day])
                ]),
                el('div', {className: 'event-details'}, [
                    el('strong', {}, [event.title]),
                    el('p', {}, [event.description])
                ])
            ])
        })
        : [el('p', {}, ['No upcoming events.'])];
    
    const eventsCard = el('div', { className: 'management-card'}, [
        el('h4', {}, [el('span', { className: 'nav-icon' }, ['📅']), ' Upcoming Events']),
        el('div', { className: 'scrollable-list event-list' }, eventElements)
    ]);
    
    // Messaging Card
    const messagingCard = el('div', { className: 'management-card clickable'}, [
        el('h4', {}, [el('span', { className: 'nav-icon' }, ['💬']), ' Messages']),
        el('p', {}, ['Communicate directly with your children\'s teachers. (Feature coming soon)'])
    ]);

    const parentDashboard = el('div', { id: 'parent-dashboard-container' }, [
        ...childCards,
        eventsCard,
        messagingCard
    ]);

    const parentPortal = el('div', { id: 'parent-portal' }, [
        parentHeader,
        el('main', { className: 'parent-portal-view' }, [parentDashboard])
    ]);

    return parentPortal;
};