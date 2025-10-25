/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, createConfirmationModal, showToast } from "../../dom-utils.js";
import { getState, setState } from "../../../state.js";
import { api } from "../../../api.js";
import { getISOWeekString } from "../../../utils.js";

const renderStaffList = () => {
    const state = getState();
    const handleRemoveStaff = async (id, name) => {
        const confirmed = await createConfirmationModal(`Are you sure you want to remove staff member "${name}"?`);
        if (confirmed) {
            showToast('Removing staff...', 'info');
            await api.removeStaff(id);
            document.dispatchEvent(new CustomEvent('render-view'));
            showToast('Staff removed.', 'success');
        }
    };
    
    const tableBody = el('tbody');
    const rows = state.staff.map(s => {
        const removeBtn = el('button', { className: 'btn btn-danger remove-staff-btn' }, ['Remove']);
        removeBtn.addEventListener('click', () => handleRemoveStaff(s.id, s.name));
        return el('tr', { 'data-id': s.id }, [
            el('td', {}, [s.id]),
            el('td', {}, [s.name]),
            el('td', {}, [s.role]),
            el('td', {}, [removeBtn])
        ]);
    });
    renderChildren(tableBody, rows);
    return tableBody;
};

const renderStudentList = () => {
     const state = getState();
     const handleRemoveStudent = async (id, name) => {
        const confirmed = await createConfirmationModal(`Are you sure you want to remove student "${name}"?`);
        if (confirmed) {
            showToast('Removing student...', 'info');
            await api.removeStudent(id);
            document.dispatchEvent(new CustomEvent('render-view'));
            showToast('Student removed.', 'success');
        }
    };

    const tableBody = el('tbody');
    const rows = state.students.map(s => {
        const removeBtn = el('button', { className: 'btn btn-danger remove-student-btn' }, ['Remove']);
        removeBtn.addEventListener('click', () => handleRemoveStudent(s.id, s.name));
        return el('tr', { 'data-id': s.id }, [
            el('td', {}, [s.id]),
            el('td', {}, [s.name]),
            el('td', {}, [s.class]),
            el('td', {}, [removeBtn])
        ]);
    });
    renderChildren(tableBody, rows);
    return tableBody;
};

const renderParentList = () => {
    const state = getState();
    const handleRemoveParent = async (id, name) => {
        const confirmed = await createConfirmationModal(`Are you sure you want to remove parent "${name}"?`);
        if (confirmed) {
            showToast('Removing parent...', 'info');
            await api.removeParent(id);
            document.dispatchEvent(new CustomEvent('render-view'));
            showToast('Parent removed.', 'success');
        }
    };
    
    const handleGenerateCode = (id, name) => {
        const state = getState();
        const code = 'SMS-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 4).toUpperCase();
        const updatedCodes = state.parentAccessCodes.filter(c => c.parentId !== id);
        updatedCodes.push({ parentId: id, code });
        setState({ parentAccessCodes: updatedCodes });
        localStorage.setItem('smartschool_parentaccesscodes', JSON.stringify(updatedCodes));
        showToast(`Access code for ${name} is: ${code}`, 'success');
    };

    const tableBody = el('tbody');
    const rows = state.parents.map(p => {
        const codeBtn = el('button', { className: 'btn-secondary-small' }, ['Code']);
        codeBtn.addEventListener('click', () => handleGenerateCode(p.id, p.name));
        const removeBtn = el('button', { className: 'btn btn-danger' }, ['Remove']);
        removeBtn.addEventListener('click', () => handleRemoveParent(p.id, p.name));
        return el('tr', { 'data-id': p.id }, [
            el('td', {}, [p.id]),
            el('td', {}, [p.name]),
            el('td', {}, [p.studentIds.join(', ')]),
            el('td', { className: 'action-cell' }, [codeBtn, removeBtn])
        ]);
    });
    renderChildren(tableBody, rows);
    return tableBody;
};


const renderStaffActivity = () => {
    const state = getState();
    const handleSendReminder = (staffId) => {
        const staff = state.staff.find(s => s.id === staffId);
        if (staff) {
            showToast(`Reminder alert sent to ${staff.name}.`, 'success');
        }
    };

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
            ? el('button', { className: 'btn-secondary-small send-reminder-btn' }, ['Send Reminder'])
            : el('span', {}, ['All Caught Up!']);
        actionButton.addEventListener('click', () => handleSendReminder(staff.id));

        return el('tr', { 'data-id': staff.id }, [
            el('td', {}, [`${staff.name} (${staff.role})`]),
            el('td', {}, [staff.lastSeen]),
            el('td', {}, [totalSubmissions.toString()]),
            el('td', { className: 'submission-status-cell' }, statusElements),
            el('td', {}, [actionButton])
        ]);
    }).filter(Boolean);
    
    return el('tbody', {}, rows);
}


export const renderAdminView = () => {
    const handleAddStaff = async (e) => {
        e.preventDefault();
        const form = e.target;
        const nameInput = form.querySelector('#staff-name');
        const roleInput = form.querySelector('#staff-role');
        if (!nameInput.value || !roleInput.value) return;

        showToast('Adding staff...', 'info');
        const newStaff = await api.addStaff(nameInput.value, roleInput.value);
        showToast(`Staff '${newStaff.name}' added! <br><strong>ID: ${newStaff.id}</strong>`, 'success');
        form.reset();
        document.dispatchEvent(new CustomEvent('render-view'));
    };
    
    const handleAddStudent = async (e) => {
        e.preventDefault();
        const form = e.target;
        const nameInput = form.querySelector('#student-name');
        const classInput = form.querySelector('#student-class');
        if (!nameInput.value || !classInput.value) return;

        showToast('Adding student...', 'info');
        const newStudent = await api.addStudent(nameInput.value, classInput.value);
        showToast(`Student '${newStudent.name}' added! <br><strong>ID: ${newStudent.id}</strong>`, 'success');
        form.reset();
        document.dispatchEvent(new CustomEvent('render-view'));
    };
    
    const handleAddParent = async (e) => {
        e.preventDefault();
        const form = e.target;
        const nameInput = form.querySelector('#parent-name');
        const studentIdsInput = form.querySelector('#parent-student-ids');
        if (!nameInput.value || !studentIdsInput.value) return;

        showToast('Adding parent...', 'info');
        const studentIds = studentIdsInput.value.split(',').map(id => id.trim());
        const newParent = await api.addParent(nameInput.value, studentIds);
        if (newParent) {
            showToast(`Parent '${newParent.name}' added! <br><strong>ID: ${newParent.id}</strong>`, 'success');
            form.reset();
            document.dispatchEvent(new CustomEvent('render-view'));
        }
    };
    
    // Forms
    const addStaffForm = el('form', { className: 'management-form form-row' }, [
        el('div', { className: 'form-group' }, [ el('input', { type: 'text', id: 'staff-name', placeholder: 'Staff Name', required: true }) ]),
        el('div', { className: 'form-group' }, [ el('input', { type: 'text', id: 'staff-role', placeholder: 'Role/Subject', required: true }) ]),
        el('button', { type: 'submit', className: 'btn' }, ['Add Staff'])
    ]);
    addStaffForm.addEventListener('submit', handleAddStaff);

    const addStudentForm = el('form', { className: 'management-form form-row' }, [
        el('div', { className: 'form-group' }, [ el('input', { type: 'text', id: 'student-name', placeholder: 'Student Name', required: true }) ]),
        el('div', { className: 'form-group' }, [ el('input', { type: 'text', id: 'student-class', placeholder: 'Class Name', required: true }) ]),
        el('button', { type: 'submit', className: 'btn' }, ['Add Student'])
    ]);
    addStudentForm.addEventListener('submit', handleAddStudent);
    
    const addParentForm = el('form', { className: 'management-form form-row' }, [
        el('div', { className: 'form-group' }, [ el('input', { type: 'text', id: 'parent-name', placeholder: 'Parent Name', required: true }) ]),
        el('div', { className: 'form-group' }, [ el('input', { type: 'text', id: 'parent-student-ids', placeholder: 'Student IDs (e.g. STU-0012)', required: true }) ]),
        el('button', { type: 'submit', className: 'btn' }, ['Add Parent'])
    ]);
    addParentForm.addEventListener('submit', handleAddParent);
    

    // View component
    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'admin-grid-large' }, [
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Staff Management']),
                addStaffForm,
                el('div', { className: 'management-list' }, [
                    el('h5', {}, ['Current Staff']),
                    el('table', {}, [
                        el('thead', {}, [el('tr', {}, [el('th', {}, ['ID']), el('th', {}, ['Name']), el('th', {}, ['Role']), el('th', {}, ['Action'])])]),
                        renderStaffList()
                    ])
                ])
            ]),
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Student Management']),
                addStudentForm,
                el('div', { className: 'management-list' }, [
                    el('h5', {}, ['Enrolled Students']),
                    el('table', {}, [
                        el('thead', {}, [el('tr', {}, [el('th', {}, ['ID']), el('th', {}, ['Name']), el('th', {}, ['Class']), el('th', {}, ['Action'])])]),
                        renderStudentList()
                    ])
                ])
            ])
        ]),
        el('div', { className: 'admin-grid-large', style: { marginTop: '25px' } }, [
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Parent Management']),
                addParentForm,
                el('div', { className: 'management-list' }, [
                    el('h5', {}, ['Registered Parents']),
                    el('table', {}, [
                         el('thead', {}, [el('tr', {}, [el('th', {}, ['ID']), el('th', {}, ['Name']), el('th', {}, ['Children IDs']), el('th', {}, ['Action'])])]),
                        renderParentList()
                    ])
                ])
            ]),
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Staff Activity Monitoring']),
                el('div', { className: 'management-list' }, [
                    el('table', {}, [
                        el('thead', {}, [el('tr', {}, [
                            el('th', {}, ['Staff']),
                            el('th', {}, ['Last Seen']),
                            el('th', {}, ['Records Submitted']),
                            el('th', {}, ['Submission Status']),
                            el('th', {}, ['Action'])
                        ])]),
                        renderStaffActivity()
                    ])
                ])
            ])
        ])
    ]);
    
    // Re-render logic for this view specifically
    view.addEventListener('render-view', () => {
        // This is a bit inefficient, but simple for this architecture.
        // It rerenders the tables when data changes.
        const newStaffList = renderStaffList();
        view.querySelector('table:nth-of-type(1) tbody').replaceWith(newStaffList);
        
        const newStudentList = renderStudentList();
        view.querySelector('table:nth-of-type(2) tbody').replaceWith(newStudentList);
        
        const newParentList = renderParentList();
        view.querySelector('table:nth-of-type(3) tbody').replaceWith(newParentList);

        const newActivityList = renderStaffActivity();
        view.querySelector('table:nth-of-type(4) tbody').replaceWith(newActivityList);
    });
    
    return view;
};
