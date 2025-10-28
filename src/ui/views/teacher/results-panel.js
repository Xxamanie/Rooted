/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren } from "../../dom-utils.js";
import { renderReportsView } from "./reports.js";
import { renderProgressView } from "./progress.js";
import { renderResultsView } from "./results.js";

export const renderResultsPanelView = () => {
    const panels = {
        results: { button: null, name: 'Results' },
        progress: { button: null, name: 'Student Progress Tracker' },
        access: { button: null, name: 'Results Access' },
    };

    const contentContainer = el('div', {});

    const setActivePanel = (panelKey) => {
        Object.keys(panels).forEach(key => {
            const panel = panels[key];
            const button = panel.button;
            if (key === panelKey) {
                if (button) button.classList.add('active');
                
                let newContent;
                if (panelKey === 'results') newContent = renderReportsView();
                else if (panelKey === 'progress') newContent = renderProgressView();
                else if (panelKey === 'access') newContent = renderResultsView();

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
    setActivePanel('results');

    return view;
};
