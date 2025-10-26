/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../../dom-utils.js";
import { getState } from "../../../state.js";
import { api } from "../../../api.js";

const renderSchemeList = (container) => {
    const { schemes } = getState();
    if (schemes.length === 0) {
        renderChildren(container, [el('p', {}, ['No schemes submitted yet.'])]);
        return;
    }

    const schemeElements = schemes.map(s => el('div', { className: 'scheme-item' }, [
        el('h5', {}, [`${s.subject} - ${s.term}`]),
        el('p', {}, [s.details])
    ]));
    renderChildren(container, schemeElements);
};

export const renderSchemeView = () => {
    const schemeListContainer = el('div', { className: 'scrollable-list' });

    const handleAddScheme = async (e) => {
        e.preventDefault();
        const form = e.target;
        const termSelect = form.querySelector('#scheme-term');
        const subjectInput = form.querySelector('#scheme-subject');
        const detailsTextarea = form.querySelector('#scheme-details');
        
        if(!subjectInput.value || !detailsTextarea.value) return;

        showToast('Saving scheme...', 'info');
        await api.addScheme(termSelect.value, subjectInput.value, detailsTextarea.value);
        renderSchemeList(schemeListContainer);
        showToast('Scheme saved successfully!', 'success');
        form.reset();
    };
    
    const form = el('form', { className: 'management-form' }, [
        el('div', { className: 'form-group' }, [
            el('label', {}, ['Term']),
            el('select', { id: 'scheme-term' }, [
                el('option', {}, ['First Term']),
                el('option', {}, ['Second Term']),
                el('option', { selected: true }, ['Third Term']),
            ])
        ]),
        el('div', { className: 'form-group' }, [
            el('label', {}, ['Subject']),
            el('input', { type: 'text', id: 'scheme-subject', required: true })
        ]),
        el('div', { className: 'form-group' }, [
            el('label', {}, ['Scheme Details']),
            el('textarea', { id: 'scheme-details', rows: 10, required: true })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Submit Scheme'])
    ]);
    form.addEventListener('submit', handleAddScheme);
    
    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'scheme-grid' }, [
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Submit Scheme of Work']),
                form
            ]),
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Submitted Schemes']),
                schemeListContainer
            ])
        ])
    ]);
    
    renderSchemeList(schemeListContainer);
    
    return view;
};