/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast, showSpinner, hideSpinner } from "../../dom-utils.js";
import { getState, setState } from "../../../state.js";
import { api } from "../../../api.js";
import { aiService } from "../../../services/ai.js";

const renderTimetable = (container) => {
    const { timetable } = getState();
    if (!timetable) {
        renderChildren(container, [el('p', {className: 'placeholder-text'}, ['Generate a timetable to see it displayed here.'])]);
        return;
    }

    const headers = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => el('th', {}, [day]));
    const rows = timetable.map(slot => el('tr', {}, [
        el('td', { className: 'time-cell' }, [slot.time]),
        el('td', {}, [slot.monday]),
        el('td', {}, [slot.tuesday]),
        el('td', {}, [slot.wednesday]),
        el('td', {}, [slot.thursday]),
        el('td', {}, [slot.friday]),
    ]));

    const table = el('table', { className: 'timetable-table' }, [
        el('thead', {}, [el('tr', {}, headers)]),
        el('tbody', {}, rows)
    ]);
    
    renderChildren(container, [table]);
};

export const renderTimetableView = () => {
    const timetableContainer = el('div');
    
    const handleGenerateTimetable = async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('button');
        button.disabled = true;
        showSpinner('#timetable-card');
        
        const state = getState();
        const classes = [...new Set(state.students.map(s => s.class))].join(', ');
        const offLimits = document.getElementById('timetable-off-limits').value;
        const teachersAndSubjects = state.staff
            .filter(s => s.role !== 'Administrator')
            .map(t => `${t.name} teaches ${t.role}`)
            .join('; ');

        const newTimetable = await aiService.generateTimetable(classes, offLimits, teachersAndSubjects);

        if (newTimetable) {
            localStorage.setItem('smartschool_timetable', JSON.stringify(newTimetable));
            setState({ timetable: newTimetable });
            renderTimetable(timetableContainer);
            showToast('Timetable generated successfully!', 'success');
        }
        
        button.disabled = false;
        hideSpinner('#timetable-card');
    };
    
    const form = el('form', {}, [
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'timetable-off-limits' }, ['Off-Limit Times (Optional)']),
            el('input', { type: 'text', id: 'timetable-off-limits', placeholder: 'e.g., Friday 14:00-16:00' })
        ]),
        el('p', { className: 'settings-description' }, [
            'The AI will automatically use all registered classes and teachers. Specify any timeslots that should be kept free.'
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Generate Timetable'])
    ]);
    form.addEventListener('submit', handleGenerateTimetable);
    
    const view = el('div', { className: 'tab-content' }, [
        el('div', { id: 'timetable-card', className: 'management-card', style: { position: 'relative' } }, [
            el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
            el('h3', {}, ['AI Timetable Generator']),
            form,
            el('hr', { style: { margin: '25px 0' } }),
            timetableContainer
        ])
    ]);
    
    renderTimetable(timetableContainer);
    
    return view;
};