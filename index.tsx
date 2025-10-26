import { api } from './src/api.js';
import { getState, setState } from './src/state.js';
import { renderLoginView } from './src/ui/views/login.js';
import { renderTeacherShell } from './src/ui/views/teacher-shell.js';
import { renderStudentPortal } from './src/ui/views/student-portal.js';
import { renderParentPortal } from './src/ui/views/parent-portal.js';

const appContainer = document.getElementById('app');

const renderApp = () => {
    const state = getState();
    if (!appContainer) return;
    appContainer.innerHTML = '';

    if (state.currentUser) {
        appContainer.appendChild(renderTeacherShell());
    } else if (state.currentStudent) {
        appContainer.appendChild(renderStudentPortal());
    } else if (state.currentParent) {
        appContainer.appendChild(renderParentPortal());
    } else {
        appContainer.appendChild(renderLoginView());
    }
}

const init = async () => {
    const loadedState = await api.loadInitialState();
    setState(loadedState);

    const apiKey = localStorage.getItem('smartschool_apiKey');
    const isLiveMode = localStorage.getItem('smartschool_liveMode') === 'true';
    setState({ 
        ...getState(),
        apiKey,
        isLiveMode,
    });
    
    document.addEventListener('state-change', (e) => {
        // Fix: Property 'detail' does not exist on type 'Event'. Cast to CustomEvent.
        const detail = (e as CustomEvent).detail;
        if (detail.rerender) {
            renderApp();
        }
    });

    renderApp();
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}


document.addEventListener('DOMContentLoaded', init);