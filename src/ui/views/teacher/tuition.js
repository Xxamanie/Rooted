/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../../dom-utils.js";
import { getState, setState } from "../../../state.js";
import { api } from "../../../api.js";

const renderPaymentHistoryModal = (studentId) => {
    const { students, paymentHistory } = getState();
    const student = students.find(s => s.id === studentId);
    
    const historyForStudent = paymentHistory.filter(p => p.studentId === studentId);
    
    let modalContent;
    if (historyForStudent.length > 0) {
        const rows = historyForStudent.map(p => el('tr', {}, [
            el('td', {}, [new Date(p.date).toLocaleDateString()]),
            el('td', {}, [`$${p.amount}`]),
            el('td', {}, [p.note || '-'])
        ]));
        modalContent = el('table', {className: 'payment-history-table'}, [
            el('thead', {}, [el('tr', {}, [el('th', {}, ['Date']), el('th', {}, ['Amount']), el('th', {}, ['Note'])])]),
            el('tbody', {}, rows)
        ]);
    } else {
        modalContent = el('p', {}, ['No payment history found for this student.']);
    }

    const modal = el('div', { className: 'modal-overlay visible' }, [
        el('div', { className: 'modal-content' }, [
            el('h3', {}, [`Payment History for ${student.name}`]),
            modalContent,
            el('div', {className: 'modal-footer'}, [
                el('button', {className: 'btn btn-secondary'}, ['Close'])
            ])
        ])
    ]);
    
    modal.querySelector('.btn-secondary').addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    });
    
    document.body.appendChild(modal);
};

const renderProcessPaymentModal = (studentId, balance, onPaymentSuccess) => {
    const amountInput = el('input', {type: 'number', id: 'payment-amount', value: balance, max: balance, min: '0.01', step: '0.01'});
    const noteInput = el('textarea', {id: 'payment-note', placeholder: 'Optional payment note (e.g., "Cash payment")', rows: 2});

    const form = el('form', {}, [
        el('div', {className: 'form-group'}, [el('label', {htmlFor: 'payment-amount'}, ['Payment Amount']), amountInput]),
        el('div', {className: 'form-group'}, [el('label', {htmlFor: 'payment-note'}, ['Note']), noteInput]),
    ]);

    const modal = el('div', { className: 'modal-overlay visible' }, [
        el('div', { className: 'modal-content' }, [
            el('h3', {}, ['Process Payment']),
            form,
            el('div', {className: 'modal-footer'}, [
                el('button', {className: 'btn btn-secondary'}, ['Cancel']),
                el('button', {className: 'btn'}, ['Confirm Payment'])
            ])
        ])
    ]);

    const closeModal = () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.btn-secondary').addEventListener('click', closeModal);
    modal.querySelector('.btn').addEventListener('click', async () => {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0 || amount > balance) {
            showToast('Invalid payment amount.', 'error');
            return;
        }
        
        showToast('Processing payment...', 'info');
        const updatedState = await api.processTuitionPayment(studentId, amount, noteInput.value);
        setState(updatedState); // Update state with response from server
        showToast('Payment processed successfully!', 'success');
        onPaymentSuccess();
        closeModal();
    });

    document.body.appendChild(modal);
};

const renderTuitionTable = (container, filter = '') => {
    const { students, tuitionRecords } = getState();
    const lcf = filter.toLowerCase();
    
    const filteredStudents = students
        .filter(s => s.name.toLowerCase().includes(lcf) || s.id.toLowerCase().includes(lcf))
        .sort((a,b) => a.name.localeCompare(b.name));

    const rows = filteredStudents.map(student => {
        const record = tuitionRecords.find(t => t.studentId === student.id);
        if (!record) return null;

        const balance = record.amountBilled - record.amountPaid;
        
        let statusText = 'Owing';
        let statusClass = 'status-owing';
        if (balance <= 0) {
            statusText = 'Paid';
            statusClass = 'status-paid';
        } else if (record.amountPaid > 0) {
            statusText = 'Partially Paid';
            statusClass = 'status-partially-paid';
        }

        const viewHistoryBtn = el('button', {className: 'btn-secondary', style: 'margin-right: 5px;'}, ['History']);
        viewHistoryBtn.addEventListener('click', () => renderPaymentHistoryModal(student.id));

        let actionButton;
        if (balance > 0) {
            actionButton = el('button', { className: 'btn' }, ['Process Payment']);
            actionButton.addEventListener('click', () => {
                renderProcessPaymentModal(student.id, balance, () => {
                    renderTuitionTable(container, filter);
                });
            });
        } else {
            actionButton = el('span', {}, ['-']);
        }
        
        return el('tr', { 'data-id': student.id }, [
            el('td', {}, [student.id]),
            el('td', {}, [student.name]),
            el('td', {}, [student.class]),
            el('td', {}, [el('span', { className: `status-badge ${statusClass}` }, [statusText])]),
            el('td', {}, [`$${record.amountBilled}`]),
            el('td', {}, [`$${record.amountPaid}`]),
            el('td', {}, [el('strong', {}, [`$${balance}`])]),
            el('td', {}, [viewHistoryBtn, actionButton])
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
                            el('th', {}, ['Billed']),
                            el('th', {}, ['Paid']),
                            el('th', {}, ['Balance']),
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