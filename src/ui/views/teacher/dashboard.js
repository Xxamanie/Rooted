/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../../dom-utils.js";
import { getState } from "../../../state.js";
import { api } from "../../../api.js";

const renderTaskManagementCard = () => {
    const listContainer = el('div', { className: 'task-list-container' });

    const renderTaskList = () => {
        const { tasks } = getState();
        if (tasks.length === 0) {
            renderChildren(listContainer, [
                el('p', { className: 'placeholder-text', style: { padding: '20px 0'} }, ['Your to-do list is empty.'])
            ]);
            return;
        }

        const taskElements = tasks.map(task => {
            const checkbox = el('input', { type: 'checkbox', checked: task.completed, 'data-id': task.id });
            const deleteBtn = el('button', { className: 'delete-task-btn', 'data-id': task.id, title: 'Delete Task' }, ['×']);
            
            return el('li', { className: `task-item ${task.completed ? 'completed' : ''}` }, [
                checkbox,
                el('label', {}, [task.text]),
                deleteBtn
            ]);
        });
        const ul = el('ul', { className: 'task-list' }, taskElements);
        renderChildren(listContainer, [ul]);
    };
    
    const handleAddTask = async (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const text = input.value.trim();
        if (text) {
            await api.addTask(text);
            input.value = '';
            renderTaskList();
        }
    };
    
    const handleListClick = async (e) => {
        const target = e.target;
        if (target.matches('input[type="checkbox"]')) {
            const id = parseInt(target.dataset.id, 10);
            await api.updateTaskStatus(id, target.checked);
            renderTaskList();
        } else if (target.matches('.delete-task-btn')) {
            const id = parseInt(target.dataset.id, 10);
            await api.removeTask(id);
            renderTaskList();
        }
    };
    
    const form = el('form', { id: 'task-form' }, [
        el('input', { type: 'text', placeholder: 'Add a new task...', required: true }),
        el('button', { type: 'submit', className: 'btn' }, ['Add'])
    ]);
    form.addEventListener('submit', handleAddTask);
    listContainer.addEventListener('click', handleListClick);

    const card = el('div', { className: 'management-card' }, [
        el('h4', {}, ['My Tasks']),
        form,
        listContainer
    ]);
    
    document.addEventListener('state-change', (e) => {
        // Re-render task list if the state change affected tasks.
        if (e.detail?.tasks !== undefined) {
             renderTaskList();
        }
    });

    renderTaskList();
    return card;
};

export const renderDashboardView = () => {
    return el('div', { className: 'tab-content' }, [
        el('div', { className: 'dashboard-banner' }, [
            el('h2', {}, ['Welcome to Smart School!']),
            el('p', {}, ['Your all-in-one platform for modern education management. Navigate through the sidebar to access powerful features.'])
        ]),
        el('div', { className: 'dashboard-grid' }, [
            renderTaskManagementCard(),
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