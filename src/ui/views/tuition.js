/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../dom-utils.js";
import { getState } from "../../state.js";
import { api } from "../../api.js";

const renderTuitionTable = (container, filter = '') => {
    const { students, tuitionRecords } = getState();
    const lcf = filter.toLowerCase();
    
    const filteredStudents = students
        .filter(s => s.name.toLowerCase().includes(lcf) || s.id.toLowerCase().includes(lcf))
        .sort((a,b) => a.name.localeCompare(b.name));

    const rows = filteredStudents.map(student => {
        const record = tuitionRecords.find(t => t.studentId === student.id);
        if (!record) return null;
        
        const statusClass = record.status === 'Paid' ? 'status-paid' : 'status-owing';
        let actionButton;

        if (record.status === 'Owing') {
            actionButton = el('button', { className: 'btn' }, ['Process Payment']);
            actionButton.addEventListener('click', async () => {
                showToast('Processing payment...', 'info');
                await api.processTuitionPayment(student.id);
                renderTuitionTable(container, filter);
                showToast('Payment processed successfully!', 'success');
            });
        } else {
            actionButton = el('span', {}, ['Paid']);
        }
        
        return el('tr', { 'data-id': student.id }, [
            el('td', {}, [student.id]),
            el('td', {}, [student.name]),
            el('td', {}, [student.class]),
            el('td', {}, [el('span', { className: `status-badge ${statusClass}` }, [record.status])]),
            el('td', {}, [actionButton])
        ]);
    }).filter(Boolean);

    renderChildren(container, rows);
};

export const renderTuitionView = () => {
    const tableBody = el('tbody');
    const searchInput = el('input', { type: 'search', placeholder: 'Search by student name or ID...' });
    
    searchInput.addEventListener('input', (e) => {
        renderTuitionTable(tableBody, e.target.value);
    });

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['Tuition Management']),
            el('div', { className: 'form-group' }, [
                searchInput
            ]),
            el('div', { className: 'management-list' }, [
                el('table', {}, [
                    el('thead', {}, [
                        el('tr', {}, [
                            el('th', {}, ['Student ID']),
                            el('th', {}, ['Name']),
                            el('th', {}, ['Class']),
                            el('th', {}, ['Status']),
                            el('th', {}, ['Action']),
                        ])
                    ]),
                    tableBody
                ])
            ])
        ])
    ]);
    
    renderTuitionTable(tableBody);
    
    return view;
};