/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../dom-utils.js";
import { getState } from "../../state.js";
import { api } from "../../api.js";

const renderRecordList = (container) => {
    const { recordsOfWork } = getState();
    if (recordsOfWork.length === 0) {
        renderChildren(container, [el('p', {}, ['No records submitted yet.'])]);
        return;
    }
    
    const recordElements = recordsOfWork.map(r => el('div', { className: 'record-item' }, [
        el('h5', {}, [`${r.subject} - ${r.class} (Week: ${r.week.split('-W')[1]})`]),
        el('p', {}, [el('strong', {}, ['Topics: ']), r.topics]),
        el('p', {}, [el('strong', {}, ['Assessment: ']), r.assessment || 'N/A']),
        el('div', { className: 'record-meta' }, [
            el('span', {}, ['Submitted by: ', el('strong', {}, [r.teacherName])]),
            el('span', {}, [`On: ${r.dateSubmitted}`])
        ])
    ]));
    
    renderChildren(container, recordElements);
};

const populateTeacherSelector = (selectElement) => {
    const { staff } = getState();
    const teachers = staff.filter(s => s.role !== 'Administrator').sort((a, b) => a.name.localeCompare(b.name));
    selectElement.innerHTML = '';
    selectElement.appendChild(el('option', { value: '', textContent: '-- Select Teacher --' }));
    teachers.forEach(teacher => {
        selectElement.appendChild(el('option', { value: teacher.id, textContent: `${teacher.name} (${teacher.role})`}));
    });
};


export const renderRecordsView = () => {
    const recordListContainer = el('div', { className: 'scrollable-list' });
    const teacherSelect = el('select', { required: true });
    
    const handleSaveRecord = async (e) => {
        e.preventDefault();
        const form = e.target;
        const recordData = {
            teacherId: teacherSelect.value,
            teacherName: teacherSelect.options[teacherSelect.selectedIndex].text,
            subject: form.querySelector('#record-subject').value,
            class: form.querySelector('#record-class').value,
            week: form.querySelector('#record-week').value,
            topics: form.querySelector('#record-topics').value,
            assessment: form.querySelector('#record-assessment').value,
        };

        if (!recordData.teacherId || !recordData.subject || !recordData.class || !recordData.week || !recordData.topics) {
            showToast('Please fill all required fields.', 'error');
            return;
        }
        
        showToast('Saving record...', 'info');
        await api.addRecordOfWork(recordData);
        renderRecordList(recordListContainer);
        showToast('Record of work saved successfully!', 'success');
        form.reset();
        populateTeacherSelector(teacherSelect); // Repopulate to reset
    };
    
    const form = el('form', { className: 'record-form-card' }, [
        el('h4', {}, ['Submit Record of Work']),
        el('div', { className: 'form-row' }, [
            el('div', { className: 'form-group' }, [
                el('label', {}, ['Teacher']),
                teacherSelect
            ]),
            el('div', { className: 'form-group' }, [
                el('label', {}, ['Subject']),
                el('input', { type: 'text', id: 'record-subject', required: true })
            ])
        ]),
        el('div', { className: 'form-row' }, [
            el('div', { className: 'form-group' }, [
                el('label', {}, ['Class']),
                el('input', { type: 'text', id: 'record-class', required: true })
            ]),
            el('div', { className: 'form-group' }, [
                el('label', {}, ['Week']),
                el('input', { type: 'week', id: 'record-week', required: true })
            ])
        ]),
        el('div', { className: 'form-group' }, [
            el('label', {}, ['Topics Covered']),
            el('textarea', { id: 'record-topics', rows: 4, required: true })
        ]),
        el('div', { className: 'form-group' }, [
            el('label', {}, ['Assessment / Remarks (Optional)']),
            el('textarea', { id: 'record-assessment', rows: 2 })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Submit Record'])
    ]);
    form.addEventListener('submit', handleSaveRecord);

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'scheme-grid' }, [
            form,
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Submitted Records']),
                recordListContainer
            ])
        ])
    ]);
    
    populateTeacherSelector(teacherSelect);
    renderRecordList(recordListContainer);
    
    return view;
};