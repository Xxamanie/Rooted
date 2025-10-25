/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren } from "../../dom-utils.js";
import { getState, setState } from "../../../state.js";
import { api } from "../../../api.js";
import { navigateTo, renderCurrentView, registerView, getCurrentView } from "../../../router.js";

// Import view renderers
import { renderDashboardView } from "./dashboard.js";
import { renderAnalyticsView } from "./analytics.js";
import { renderAdminView } from "./admin.js";
import { renderClassroomView } from "./classroom.js";
import { renderRecordsView } from "./records.js";
import { renderSchemeView } from "./scheme.js";
import { renderAssessmentView, renderExaminationView } from "./assessment.js";
import { renderReportsView } from "./reports.js";
import { renderTimetableView } from "./timetable.js";
import { renderProgressView } from "./progress.js";
import { renderTuitionView } from "./tuition.js";
import { renderResultsView } from "./results.js";
import { showToast } from "../../dom-utils.js";


let apiKeyModal;

export const showApiKeyModal = () => {
    if (!apiKeyModal) return;
    apiKeyModal.style.display = 'flex';
    setTimeout(() => apiKeyModal.classList.add('visible'), 10);
};

const hideApiKeyModal = () => {
    if (!apiKeyModal) return;
    apiKeyModal.classList.remove('visible');
    setTimeout(() => {
        if (apiKeyModal) apiKeyModal.style.display = 'none';
    }, 300);
};

const createApiKeyModal = () => {
    const handleSaveApiKey = () => {
        const apiKeyInput = apiKeyModal.querySelector('#api-key-input');
        const newKey = apiKeyInput.value.trim();
        if (newKey) {
            localStorage.setItem('smartschool_apiKey', newKey);
            setState({ apiKey: newKey });
            showToast('API Key saved successfully!', 'success');
            hideApiKeyModal();
        } else {
            showToast('Please enter a valid API key.', 'error');
        }
    };

    apiKeyModal = el('div', { id: 'api-key-modal', className: 'modal-overlay' }, [
        el('div', { className: 'modal-content', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'api-key-title' }, [
            el('button', { className: 'modal-close-btn', 'aria-label': 'Close' }, ['×']),
            el('h3', { id: 'api-key-title' }, ['API Key Configuration']),
            el('p', {}, ['Please enter your Google AI Gemini API key. You can get a new key from ', el('a', { href: "https://aistudio.google.com/app/apikey", target: "_blank", rel: "noopener noreferrer" }, ['Google AI Studio']), '.']),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'api-key-input' }, ['Gemini API Key']),
                el('input', { type: 'password', id: 'api-key-input', placeholder: 'Enter your API key here' })
            ]),
            el('button', { id: 'save-api-key-btn', className: 'btn' }, ['Save Key'])
        ])
    ]);

    apiKeyModal.querySelector('.modal-close-btn').addEventListener('click', hideApiKeyModal);
    apiKeyModal.querySelector('#save-api-key-btn').addEventListener('click', handleSaveApiKey);
    
    return apiKeyModal;
};


const createSidebar = () => {
    const state = getState();
    const navItems = [
        { section: 'dashboard', icon: '🏠', text: 'Dashboard', adminOnly: false },
        { section: 'analytics', icon: '📊', text: 'Analytics', adminOnly: true },
        { section: 'admin', icon: '⚙️', text: 'Admin Panel', adminOnly: true },
        { section: 'classroom', icon: '🏫', text: 'Virtual Classroom', adminOnly: false },
        { section: 'records', icon: '📋', text: 'Record of Work', adminOnly: false },
        { section: 'scheme', icon: '📚', text: 'Scheme of Work', adminOnly: false },
        { section: 'assessment', icon: '✍️', text: 'Assessment Center', adminOnly: false },
        { section: 'examination', icon: '📝', text: 'Online Examination', adminOnly: false },
        { section: 'reports', icon: '🎓', text: 'Report Cards', adminOnly: false },
        { section: 'timetable', icon: '📅', text: 'Timetable Generator', adminOnly: false },
        { section: 'progress', icon: '📈', text: 'Progress Tracker', adminOnly: false },
        { section: 'tuition', icon: '💰', text: 'Tuition', adminOnly: false },
        { section: 'results', icon: '🏅', text: 'Results Access', adminOnly: false },
    ];
    
    const navLinks = navItems
        .filter(item => !item.adminOnly || (item.adminOnly && state.currentUser?.role === 'Administrator'))
        .map(item => el('li', { className: 'nav-item' }, [
            el('a', { className: 'nav-link', 'data-section': item.section }, [
                el('span', { className: 'nav-icon' }, [item.icon]),
                ` ${item.text}`
            ])
        ]));

    const sidebar = el('div', { className: 'sidebar' }, [
        el('div', { className: 'logo-section' }, [
            el('div', { className: 'logo' }, [
                el('img', { src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik01IDEzLjE4djRMMTIgMjFsNy0zLjgxdi00TDEyIDE3bC03LTMuODJ6TTEyIDNMMSA5bDExIDYgOS00LjkxVjE3aDJWOUwxMiAzIi8+PC9zdmc+", alt: "Smart School Logo" })
            ]),
            el('span', { className: 'logo-text' }, ['Smart School'])
        ]),
        el('ul', { className: 'nav-menu' }, navLinks)
    ]);

    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            const section = link.dataset.section;
            navigateTo(section);
             if (window.innerWidth <= 992) {
                document.getElementById('teacher-app')?.classList.remove('sidebar-open');
            }
        }
    });

    return sidebar;
};


export const renderTeacherShell = () => {
    const state = getState();

    // Register all the views with the router
    registerView('dashboard', renderDashboardView);
    registerView('analytics', renderAnalyticsView);
    registerView('admin', renderAdminView);
    registerView('classroom', renderClassroomView);
    registerView('records', renderRecordsView);
    registerView('scheme', renderSchemeView);
    registerView('assessment', renderAssessmentView);
    registerView('examination', renderExaminationView);
    registerView('reports', renderReportsView);
    registerView('timetable', renderTimetableView);
    registerView('progress', renderProgressView);
    registerView('tuition', renderTuitionView);
    registerView('results', renderResultsView);

    const pageTitle = el('h1', { id: 'pageTitle' }, ['Dashboard']);
    const contentBody = el('div', { className: 'content-body' });
    const sidebar = createSidebar();

    const updateActiveNav = () => {
        const currentView = getCurrentView();
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.section === currentView) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        const viewName = currentView.charAt(0).toUpperCase() + currentView.slice(1);
        const viewTitle = viewName.replace(/([A-Z])/g, ' $1').trim();
        pageTitle.textContent = viewTitle;
    };
    
    document.addEventListener('navigation', () => {
        renderChildren(contentBody, [renderCurrentView()]);
        updateActiveNav();
    });

    const handleLogout = () => api.logout();

    const handleLiveModeToggle = (e) => {
        const isLive = e.target.checked;
        localStorage.setItem('smartschool_liveMode', String(isLive));
        setState({ isLiveMode: isLive });
        headerStatus.textContent = isLive ? '(Live)' : '(Local)';
        headerStatus.className = `header-status ${isLive ? 'header-status-live' : 'header-status-local'}`;
        showToast(`Network simulation is now ${isLive ? 'ON (800ms delay)' : 'OFF'}.`, 'info');
    };

    const headerStatus = el('span', {
        id: 'header-status',
        className: `header-status ${state.isLiveMode ? 'header-status-live' : 'header-status-local'}`
    }, [state.isLiveMode ? '(Live)' : '(Local)']);

    const header = el('header', { className: 'header' }, [
        el('div', { className: 'header-left' }, [pageTitle]),
        el('div', { className: 'header-right' }, [
            el('div', { className: 'settings-item live-toggle' }, [
                headerStatus,
                el('label', { htmlFor: 'live-mode-toggle', className: 'switch-container' }, [
                    el('input', { type: 'checkbox', id: 'live-mode-toggle', checked: state.isLiveMode }),
                    el('span', { className: 'switch' })
                ])
            ]),
            el('span', { className: 'header-welcome-text' }, [`Welcome, ${state.currentUser.name.split(' ')[0]}`]),
            el('div', { className: 'user-avatar' }, [state.currentUser.name.charAt(0).toUpperCase()]),
            el('button', { id: 'settings-btn', className: 'btn btn-icon-only', title: 'API Key Settings' }, ['⚙️']),
            el('button', { id: 'logout-btn', className: 'btn btn-icon-only', title: 'Logout' }, ['🚪'])
        ])
    ]);

    header.querySelector('#logout-btn').addEventListener('click', handleLogout);
    header.querySelector('#settings-btn').addEventListener('click', showApiKeyModal);
    header.querySelector('#live-mode-toggle').addEventListener('change', handleLiveModeToggle);

    const mainContent = el('div', { className: 'main-content' }, [
        header,
        el('main', { className: 'content-area' }, [contentBody])
    ]);
    
    const sidebarToggle = el('button', { className: 'sidebar-toggle' }, ['☰']);

    const teacherApp = el('div', { id: 'teacher-app', className: 'sidebar-open' }, [
        sidebar,
        mainContent,
        sidebarToggle,
        createApiKeyModal() // Append modal to the DOM
    ]);
    
    sidebarToggle.addEventListener('click', () => teacherApp.classList.toggle('sidebar-open'));


    // Initial render
    navigateTo('dashboard');
    updateActiveNav();
    
    return teacherApp;
};