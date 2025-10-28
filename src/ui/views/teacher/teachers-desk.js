/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren } from "../../dom-utils.js";
import { renderRecordsView } from "./records.js";
import { renderSchemeView } from "./scheme.js";
import { renderLessonPlansView } from "./lesson-plans.js";

export const renderTeachersDeskView = () => {
    const panels = {
        records: { button: null, name: 'Record of Work' },
        scheme: { button: null, name: 'Scheme of Work' },
        plans: { button: null, name: 'Lesson Plans' },
    };

    const contentContainer = el('div', {});

    const setActivePanel = (panelKey) => {
        Object.keys(panels).forEach(key => {
            const panel = panels[key];
            const button = panel.button;
            if (key === panelKey) {
                if (button) button.classList.add('active');
                
                let newContent;
                if (panelKey === 'records') newContent = renderRecordsView();
                else if (panelKey === 'scheme') newContent = renderSchemeView();
                else if (panelKey === 'plans') newContent = renderLessonPlansView();

                if (newContent) {
                     renderChildren(contentContainer, [newContent]);
                }

            } else {
                if (button) button.classList.remove('active');
            }
        });
    };

    const navButtons = Object.keys(panels).map(key => {
        const button = el('button', { className: 'panel-nav-btn', 'data-target': key }, [panels[key].name]);
        button.addEventListener('click', () => setActivePanel(key));
        panels[key].button = button;
        return button;
    });

    const nav = el('div', { className: 'panel-nav' }, navButtons);

    const view = el('div', { className: 'tab-content' }, [
        nav,
        contentContainer
    ]);

    // Set default active panel
    setActivePanel('records');

    return view;
};