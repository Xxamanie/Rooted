/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el } from "../../dom-utils.js";

export const renderDashboardView = () => {
    return el('div', { className: 'tab-content' }, [
        el('div', { className: 'dashboard-banner' }, [
            el('h2', {}, ['Welcome to Smart School!']),
            el('p', {}, ['Your all-in-one platform for modern education management. Navigate through the sidebar to access powerful features.'])
        ]),
        el('div', { className: 'dashboard-grid' }, [
            el('div', { className: 'management-card' }, [
                 el('h4', {}, ['Platform Features']),
                 el('ul', { className: 'feature-list-styled' }, [
                    el('li', {}, ['Centralized Admin Panel for staff, student, and parent management.']),
                    el('li', {}, ['Virtual Classroom for announcements and attendance tracking.']),
                    el('li', {}, ['AI tools for quiz, lesson plan, and performance summary generation.']),
                    el('li', {}, ['AI Co-pilot for essay grading and differentiated materials.']),
                    el('li', {}, ['Secure, proctored online examinations.']),
                    el('li', {}, ['Complete grading system with AI-powered report card remarks.']),
                    el('li', {}, ['AI-powered timetable generation to optimize scheduling.']),
                    el('li', {}, ['Secure portals for Students and Parents.']),
                ])
            ]),
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Getting Started with AI']),
                el('p', {}, ["To unlock the full potential of Smart School's AI tools, you need to set up your API key."]),
                el('ol', { className: 'getting-started-steps' }, [
                    el('li', {}, [el('strong', {}, ['Settings (⚙️): ']), 'Click the icon in the header.']),
                    el('li', {}, [el('strong', {}, ['Enter Key: ']), 'Paste your Gemini API key in the modal.']),
                    el('li', {}, [el('strong', {}, ['Save: ']), "You're all set!"])
                ]),
                el('p', {}, ['Now you can head to the Assessment Center, Report Cards, Timetable Generator, or Progress Tracker to leverage the power of AI.'])
            ])
        ])
    ]);
};
