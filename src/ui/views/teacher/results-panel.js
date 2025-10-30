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
        reports: { button: null, name: 'View Results' },
        progress: { button: null, name: 'Progress Tracker' },
        access: { button: null, name: 'Access Codes' },
    };

    const contentContainer = el('div', {});

    const setActivePanel = (panelKey) => {
        Object.keys(panels).forEach(key => {
            const panel = panels[key];
            const button = panel.button;
            if (key === panelKey) {
                if (button) button.classList.add('active');
                
                let newContent;
                if (panelKey === 'reports') newContent = renderReportsView();
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
    setActivePanel('reports');

    return view;
};