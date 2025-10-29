/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast } from "../dom-utils.js";
import { getState, setState } from "../../state.js";
import { api } from "../../api.js";
import { navigateTo, renderCurrentView, registerView, getCurrentView } from "../../router.js";

// Import view renderers
import { renderDashboardView } from "./teacher/dashboard.js";
import { renderAnalyticsView } from "./teacher/analytics.js";
import { renderAdminView } from "./teacher/admin.js";
import { renderClassroomView } from "./teacher/classroom.js";
import { renderTeachersDeskView } from "./teacher/teachers-desk.js";
import { renderAssessmentView, renderExaminationView } from "./teacher/assessment.js";
import { renderTimetableView } from "./teacher/timetable.js";
import { renderTuitionView } from "./teacher/tuition.js";
import { renderCreatorView } from "./teacher/creator.js";
import { renderResultsPanelView } from "./teacher/results-panel.js";


const createSidebar = () => {
    const state = getState();
    const isCreator = state.currentUser?.role === 'Creator';
    const isAdmin = state.currentUser?.role === 'Administrator';

    const navItems = [
        ...(isCreator ? [{ section: 'creator', icon: '👑', text: 'Creator Panel', exclusive: true }] : []),
        { section: 'dashboard', icon: '🏠', text: 'Dashboard' },
        { section: 'analytics', icon: '📊', text: 'Analytics', adminOnly: true },
        { section: 'admin', icon: '⚙️', text: 'Admin Panel', adminOnly: true },
        { section: 'classroom', icon: '🏫', text: 'Virtual Classroom' },
        { section: 'teachers-desk', icon: ' M', text: 'Teacher\'s Desk' },
        { section: 'assessment', icon: '✍️', text: 'Assessment Center' },
        { section: 'examination', icon: '📝', text: 'Online Examination' },
        { section: 'results', icon: '🏅', text: 'Results' },
        { section: 'timetable', icon: '📅', text: 'Timetable Generator' },
        { section: 'tuition', icon: '💰', text: 'Tuition' },
    ];
    
    const navLinks = navItems
        .filter(item => {
            if (isCreator) return true; // Creator sees all
            if (item.exclusive) return false;
            return !item.adminOnly || isAdmin;
        })
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

const renderAdminBanner = () => {
    const { adminMessage } = getState();
    if (adminMessage) {
        const banner = el('div', { className: 'admin-banner' }, [
            el('span', {}, [adminMessage.message]),
            el('button', { className: 'close-admin-btn' }, ['×'])
        ]);
        banner.querySelector('.close-admin-btn').addEventListener('click', async () => {
            banner.querySelector('button').disabled = true;
            await api.clearAdminMessage();
        });
        return banner;
    }
    return null;
}

export const renderTeacherShell = () => {
    const state = getState();
    const isCreator = state.currentUser?.role === 'Creator';
    const isAdmin = state.currentUser?.role === 'Administrator';

    // Register all the views with the router
    registerView('creator', renderCreatorView);
    registerView('dashboard', renderDashboardView);
    registerView('analytics', renderAnalyticsView);
    registerView('admin', renderAdminView);
    registerView('classroom', renderClassroomView);
    registerView('teachers-desk', renderTeachersDeskView);
    registerView('assessment', renderAssessmentView);
    registerView('examination', renderExaminationView);
    registerView('results', renderResultsPanelView);
    registerView('timetable', renderTimetableView);
    registerView('tuition', renderTuitionView);

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
        const viewTitle = viewName.replace(/([A-Z])/g, ' $1').trim().replace('Teachers Desk', 'Teacher\'s Desk');
        pageTitle.textContent = viewTitle;
    };
    
    document.addEventListener('navigation', () => {
        renderChildren(contentBody, [renderCurrentView()]);
        updateActiveNav();
    });

    const handleLogout = () => api.logout();
    
    const headerRightChildren = [];

    // --- Search Bar (for admins/creators) ---
    if (isAdmin || isCreator) {
        const searchInput = el('input', { type: 'search', id: 'header-search-input', placeholder: 'Search schools, students...' });
        const searchResultsContainer = el('div', { id: 'header-search-results' });
        const searchContainer = el('div', { className: 'header-search-container' }, [
            searchInput,
            searchResultsContainer
        ]);
        
        const handleSearch = (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const { schools, students, staff, currentUser } = getState();
            searchResultsContainer.innerHTML = '';

            if (searchTerm.length < 2) {
                searchResultsContainer.style.display = 'none';
                return;
            }

            let results = [];
            if (currentUser?.role === 'Creator') {
                results.push(...schools
                    .filter(s => s.name.toLowerCase().includes(searchTerm) || s.code.toLowerCase().includes(searchTerm))
                    .map(s => ({ type: 'School', name: s.name, id: s.id, navigateTo: 'creator' }))
                );
            }
            
            if (currentUser?.role === 'Administrator' || currentUser?.role === 'Creator') {
                 results.push(...students
                    .filter(s => s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm))
                    .map(s => ({ type: 'Student', name: s.name, id: s.id, navigateTo: 'admin' }))
                );
                results.push(...staff
                    .filter(s => s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm))
                    .map(s => ({ type: 'Staff', name: s.name, id: s.id, navigateTo: 'admin' }))
                );
            }
           
            if (results.length > 0) {
                results.slice(0, 10).forEach(result => {
                    const resultItem = el('div', { className: 'search-result-item', 'data-view': result.navigateTo, 'data-id': result.id }, [
                        el('strong', {}, [`${result.type}: `]),
                        `${result.name} (${result.id})`
                    ]);
                    searchResultsContainer.appendChild(resultItem);
                });
                searchResultsContainer.style.display = 'block';
            } else {
                searchResultsContainer.style.display = 'none';
            }
        };

        searchInput.addEventListener('input', handleSearch);

        searchResultsContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.search-result-item');
            if (item) {
                const view = item.dataset.view;
                navigateTo(view);
                searchInput.value = '';
                searchResultsContainer.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                searchResultsContainer.style.display = 'none';
            }
        });

        headerRightChildren.push(searchContainer);
    }
    
    // Add the rest of the header items
    headerRightChildren.push(
        el('span', { className: 'header-welcome-text' }, [`Welcome, ${state.currentUser.name.split(' ')[0]}`]),
        el('div', { className: 'user-avatar' }, [state.currentUser.name.charAt(0).toUpperCase()]),
        el('button', { id: 'logout-btn', className: 'btn logout-btn', title: 'Logout' }, ['Logout'])
    );


    const header = el('header', { className: 'header' }, [
        el('div', { className: 'header-left' }, [pageTitle]),
        el('div', { className: 'header-right' }, headerRightChildren)
    ]);

    header.querySelector('#logout-btn').addEventListener('click', handleLogout);

    const mainContent = el('div', { className: 'main-content' }, [
        header,
        el('main', { className: 'content-area' }, [contentBody])
    ]);
    
    if (isAdmin) {
        const banner = renderAdminBanner();
        if (banner) {
            // Prepend to mainContent so it appears above the header
            mainContent.prepend(banner);
        }
    }
    
    const sidebarToggle = el('button', { className: 'sidebar-toggle' }, ['☰']);

    const teacherApp = el('div', { id: 'teacher-app', className: `sidebar-open ${isCreator ? 'creator-mode' : ''}` }, [
        sidebar,
        mainContent,
        sidebarToggle
    ]);
    
    sidebarToggle.addEventListener('click', () => teacherApp.classList.toggle('sidebar-open'));


    // Initial render
    navigateTo(isCreator ? 'creator' : 'dashboard');
    updateActiveNav();
    
    return teacherApp;
};