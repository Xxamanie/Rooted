/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../../dom-utils.js";
import { getState, setState } from "../../state.js";
import { api } from "../../api.js";

const populateStudentSelector = (selectElement) => {
    const { students } = getState();
    const originalValue = selectElement.value;
    selectElement.innerHTML = '';
    selectElement.appendChild(el('option', { value: '', textContent: '-- Select a Student --' }));
    students
        .sort((a,b) => a.name.localeCompare(b.name))
        .forEach(student => {
            selectElement.appendChild(el('option', { value: student.id, textContent: `${student.name} (${student.id})`}));
    });
    if (originalValue) selectElement.value = originalValue;
};


export const renderResultsView = () => {
    const state = getState();
    const studentSelect = el('select');
    const tuitionStatusContainer = el('div', { style: {display: 'none'} });
    const accessCodeContainer = el('div', { style: {display: 'none'} });
    const generateBtn = el('button', { className: 'btn', disabled: true }, ['Generate Access Code']);

    const updateView = (studentId) => {
        if (!studentId) {
            tuitionStatusContainer.style.display = 'none';
            accessCodeContainer.style.display = 'none';
            generateBtn.disabled = true;
            return;
        }
        
        const tuitionRecord = state.tuitionRecords.find(t => t.studentId === studentId);
        if (tuitionRecord) {
            const statusText = tuitionRecord.status === 'Paid' ? 'Paid' : 'Owing';
            const statusClass = tuitionRecord.status === 'Paid' ? 'tuition-paid' : 'tuition-owing';
            renderChildren(tuitionStatusContainer, [
                el('h5', {}, ['Tuition Status']),
                el('p', { className: statusClass }, [statusText])
            ]);
            tuitionStatusContainer.style.display = 'block';
            generateBtn.disabled = tuitionRecord.status !== 'Paid';
        }
        accessCodeContainer.style.display = 'none';
    };

    const handleGenerateCode = () => {
        const studentId = studentSelect.value;
        if (!studentId) return;
        
        const code = 'SMS-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 4).toUpperCase();
        
        const updatedCodes = getState().accessCodes.filter(c => c.studentId !== studentId);
        updatedCodes.push({ studentId, code });
        setState({ accessCodes: updatedCodes });
        localStorage.setItem('smartschool_accesscodes', JSON.stringify(updatedCodes));

        renderChildren(accessCodeContainer, [
            el('h5', {}, ['Generated Code']),
            el('p', { className: 'access-code' }, [code])
        ]);
        accessCodeContainer.style.display = 'block';
    };
    
    populateStudentSelector(studentSelect);
    studentSelect.addEventListener('change', (e) => updateView(e.target.value));
    generateBtn.addEventListener('click', handleGenerateCode);

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['Generate Result Access Codes']),
            el('p', { className: 'settings-description', style: {marginTop: 0} }, [
                'Select a student to check their tuition status. Access codes can only be generated for students with a "Paid" status. These codes are used for the student and parent login portals.'
            ]),
             el('div', { className: 'result-access' }, [
                el('div', { className: 'form-group' }, [
                    el('label', {}, ['Select Student']),
                    studentSelect
                ]),
                tuitionStatusContainer,
                el('div', {style: {marginTop: '20px'}}, [generateBtn]),
                accessCodeContainer
            ])
        ])
    ]);
    
    return view;
};