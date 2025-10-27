

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, createConfirmationModal, showToast, renderChildren } from "../../dom-utils.js";
import { api } from "../../../api.js";
import { getState } from "../../../state.js";

const renderSchoolList = (tableBody) => {
    const { schools } = getState();
    const rows = schools.map(s => {
        const sub = s.subscription || {}; // Fallback for safety

        // Status Cell
        const statusText = `${sub.type || 'N/A'} - ${sub.status || 'Unknown'}`;
        const statusClass = (sub.status || 'expired').toLowerCase().replace(/ /g, '-');
        const statusCell = el('td', {}, [
            el('span', { className: `status-badge status-${statusClass}` }, [statusText])
        ]);

        // Editable Pricing Cell
        const pricingCell = el('td', { className: 'editable-pricing-cell', title: 'Click to edit' });
        pricingCell.textContent = `$${sub.costAnnually || 0}/yr | $${sub.costPerTerm || 0}/term`;
        
        pricingCell.addEventListener('click', (e) => {
            if (e.target.closest('.editable-pricing-inputs')) return; // Already in edit mode
            
            const originalAnnual = sub.costAnnually || 0;
            const originalTerm = sub.costPerTerm || 0;

            const annualInput = el('input', { type: 'number', value: originalAnnual });
            const termInput = el('input', { type: 'number', value: originalTerm });
            
            const inputContainer = el('div', { className: 'editable-pricing-inputs' }, [
                el('label', {}, ['A:']), annualInput,
                el('label', {}, ['T:']), termInput
            ]);
            
            pricingCell.innerHTML = '';
            pricingCell.appendChild(inputContainer);
            annualInput.focus();
            
            const handleSave = async () => {
                const newAnnual = parseFloat(annualInput.value);
                const newTerm = parseFloat(termInput.value);
                
                if ((!isNaN(newAnnual) && newAnnual !== originalAnnual) || (!isNaN(newTerm) && newTerm !== originalTerm)) {
                    await api.updateSchoolSubscription(s.id, { 
                        costAnnually: newAnnual,
                        costPerTerm: newTerm
                    });
                    showToast('Pricing updated.', 'success');
                }
                renderSchoolList(tableBody); // Rerender the list to exit edit mode
            };

            inputContainer.addEventListener('blur', handleSave, true);
            inputContainer.addEventListener('keydown', e => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') renderSchoolList(tableBody);
            });
        });

        // Actions Cell
        let actionButton;
        if (sub.type === 'Annually') {
            const isActive = sub.status === 'Active';
            actionButton = el('button', { className: 'btn-secondary-small' }, [isActive ? 'Mark Expired' : 'Mark Active']);
            actionButton.addEventListener('click', async () => {
                await api.updateSchoolSubscription(s.id, { status: isActive ? 'Expired' : 'Active' });
                renderSchoolList(tableBody);
            });
        } else { // Termly
            actionButton = el('button', { className: 'btn-secondary-small' }, ['Advance Term']);
            actionButton.addEventListener('click', async () => {
                let newStatus;
                switch (sub.status) {
                    case 'Expired': newStatus = '1st Term Paid'; break;
                    case '1st Term Paid': newStatus = '2nd Term Paid'; break;
                    case '2nd Term Paid': newStatus = '3rd Term Paid'; break;
                    case '3rd Term Paid': newStatus = 'Expired'; break;
                    default: newStatus = '1st Term Paid';
                }
                await api.updateSchoolSubscription(s.id, { status: newStatus });
                renderSchoolList(tableBody);
            });
        }
        const actionCell = el('td', { className: 'action-cell' }, [actionButton]);
        
        return el('tr', {}, [
            el('td', {}, [s.name]),
            el('td', {}, [el('strong', {}, [s.code])]),
            statusCell,
            pricingCell,
            actionCell
        ]);
    });
    renderChildren(tableBody, rows);
};

export const renderCreatorView = () => {
    const handleBroadcastMessage = async (e) => {
        e.preventDefault();
        const form = e.target;
        const messageInput = form.querySelector('#broadcast-message');
        const message = messageInput.value.trim();

        if (message) {
            await api.broadcastMessage(message);
            showToast('Broadcast message sent!', 'success');
            form.reset();
        } else {
            showToast('Message cannot be empty.', 'error');
        }
    };

    const handleAdminMessage = async (e) => {
        e.preventDefault();
        const form = e.target;
        const messageInput = form.querySelector('#admin-message');
        const message = messageInput.value.trim();

        if (message) {
            await api.sendAdminMessage(message);
            showToast('Message sent to administrators!', 'success');
            form.reset();
        } else {
            showToast('Message cannot be empty.', 'error');
        }
    };
    
    const handleRegisterSchool = async (e) => {
        e.preventDefault();
        const form = e.target;
        const nameInput = form.querySelector('#school-name');
        const typeSelect = form.querySelector('#school-sub-type');
        const annualCostInput = form.querySelector('#school-cost-annual');
        const termCostInput = form.querySelector('#school-cost-term');

        if (nameInput.value.trim()) {
            const subscriptionDetails = {
                type: typeSelect.value,
                costAnnually: parseFloat(annualCostInput.value) || 0,
                costPerTerm: parseFloat(termCostInput.value) || 0,
            };
            const newSchool = await api.registerSchool(nameInput.value.trim(), subscriptionDetails);
            showToast(`School "${newSchool.name}" registered with code: ${newSchool.code}`, 'success');
            form.reset();
            renderSchoolList(schoolListTableBody);
        } else {
            showToast('School name cannot be empty.', 'error');
        }
    };

    const handleResetAllData = async () => {
        const confirmed1 = await createConfirmationModal(
            'Are you absolutely sure you want to reset all school data? This will clear everything in local storage and cannot be undone.'
        );
        if (!confirmed1) return;

        const confirmed2 = await createConfirmationModal(
            'This is your final confirmation. Pressing "Confirm" will permanently delete all data and reload the application.'
        );
        if (confirmed2) {
            showToast('Resetting all data...', 'info');
            await api.resetAllData();
        }
    };
    
    const schoolListTableBody = el('tbody');
    renderSchoolList(schoolListTableBody);

    const broadcastForm = el('form', { id: 'broadcast-form' }, [
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'broadcast-message' }, ['Broadcast Message']),
            el('textarea', { id: 'broadcast-message', rows: 3, placeholder: 'e.g., Scheduled maintenance tonight at 10 PM.', required: true })
        ]),
        el('button', { type: 'submit', className: 'btn btn-info', style: { width: 'auto' } }, ['Send Broadcast to All Users'])
    ]);
    broadcastForm.addEventListener('submit', handleBroadcastMessage);

    const adminMessageForm = el('form', { id: 'admin-message-form' }, [
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'admin-message' }, ['Admin-Only Message']),
            el('textarea', { id: 'admin-message', rows: 3, placeholder: 'e.g., Reminder: Your subscription is due for renewal...', required: true })
        ]),
        el('button', { type: 'submit', className: 'btn', style: { width: 'auto', backgroundColor: 'var(--accent-gold-dark)' } }, ['Send to Administrators'])
    ]);
    adminMessageForm.addEventListener('submit', handleAdminMessage);
    
    const registerSchoolForm = el('form', {}, [
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'school-name' }, ['New School Name']),
            el('input', { type: 'text', id: 'school-name', placeholder: 'e.g., Northwood High', required: true })
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'school-sub-type' }, ['Subscription Bundle']),
            el('select', { id: 'school-sub-type' }, [
                el('option', { value: 'Annually' }, ['Annually']),
                el('option', { value: 'Termly' }, ['Termly']),
            ])
        ]),
        el('div', { className: 'form-row', style: { marginBottom: '0'} }, [
             el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'school-cost-annual' }, ['Annual Cost ($)']),
                el('input', { type: 'number', id: 'school-cost-annual', placeholder: 'e.g., 1200', min: '0' })
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'school-cost-term' }, ['Cost Per Term ($)']),
                el('input', { type: 'number', id: 'school-cost-term', placeholder: 'e.g., 500', min: '0' })
            ]),
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Register School'])
    ]);
    registerSchoolForm.addEventListener('submit', handleRegisterSchool);
    
    const resetDataBtn = el('button', { className: 'btn btn-danger' }, ['Reset All School Data']);
    resetDataBtn.addEventListener('click', handleResetAllData);

    return el('div', { className: 'tab-content' }, [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['Creator Controls']),
            el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '25px' } }, [
                'This panel contains powerful tools for managing the application. Use with caution.'
            ]),

            el('div', { className: 'admin-grid-large' }, [
                el('div', { className: 'record-form-card' }, [
                    el('h4', {}, ['School Registration & Subscription']),
                    el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '15px' } }, [
                        'Register a new school, manage their subscription status, and set custom pricing.'
                    ]),
                    registerSchoolForm
                ]),
                el('div', { className: 'record-form-card' }, [
                     el('h4', {}, ['Registered Schools']),
                     el('div', { className: 'management-list' }, [
                        el('table', {}, [
                            el('thead', {}, [
                                el('tr', {}, [
                                    el('th', {}, ['School Name']), 
                                    el('th', {}, ['School Code']),
                                    el('th', {}, ['Status']),
                                    el('th', {}, ['Pricing']),
                                    el('th', {}, ['Actions'])
                                ])
                            ]),
                            schoolListTableBody
                        ])
                     ])
                ]),
            ]),
            
            el('div', { className: 'record-form-card', style: { marginTop: '25px' } }, [
                el('h4', {}, ['System-Wide Broadcast']),
                el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '15px' } }, [
                    'Send a message that will appear as a banner for every user (teachers, students, parents) upon their next page load.'
                ]),
                broadcastForm
            ]),

            el('div', { className: 'record-form-card', style: { marginTop: '25px' } }, [
                el('h4', {}, ['Administrator Message']),
                el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '15px' } }, [
                    'Send a reminder or notice that will only be visible to users with the "Administrator" role. Ideal for subscription reminders.'
                ]),
                adminMessageForm
            ]),

            el('div', { className: 'record-form-card', style: { borderTop: '2px solid var(--danger-color)', marginTop: '25px' } }, [
                el('h4', {}, ['Danger Zone']),
                el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '15px' } }, [
                    'This action will completely wipe all data stored in the browser (staff, students, grades, etc.) and reset the app to its initial state.'
                ]),
                resetDataBtn
            ])
        ])
    ]);
};