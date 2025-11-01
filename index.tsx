
import { api } from './src/api.js';
import { getState, setState } from './src/state.js';
import { renderLoginView } from './src/ui/views/login.js';
import { renderTeacherShell } from './src/ui/views/teacher-shell.js';
import { renderStudentPortal } from './src/ui/views/student-portal.js';
import { renderParentPortal } from './src/ui/views/parent-portal.js';
import { el } from './src/ui/dom-utils.js';

const appContainer = document.getElementById('app');

const renderBroadcastBanner = () => {
    const { broadcastMessage: broadcast } = getState();
    if (broadcast) {
        const banner = el('div', { className: 'broadcast-banner' }, [
            el('span', {}, [broadcast.message]),
            el('button', { className: 'close-broadcast-btn' }, ['×'])
        ]);
        banner.querySelector('.close-broadcast-btn').addEventListener('click', async () => {
            banner.querySelector('button').disabled = true;
            await api.clearBroadcastMessage();
        });
        return banner;
    }
    return null;
}

const renderApp = () => {
    const state = getState();
    if (!appContainer) return;
    appContainer.innerHTML = '';

    const banner = renderBroadcastBanner();
    if (banner) appContainer.appendChild(banner);

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

const renderErrorView = (retryHandler, error = null) => {
    if (!appContainer) return;
    const retryBtn = el('button', { className: 'btn' }, ['Retry Connection']);
    retryBtn.addEventListener('click', retryHandler);

    let errorDetails = null;
    if (error) {
        // If the error message is a full HTML page, it's not useful to display.
        // We only show the error message itself, not the client-side stack trace
        // which can be misleading for a server-side issue.
        const errorMessage = (error.message && error.message.trim().toLowerCase().startsWith('<!doctype html'))
            ? 'The server returned a generic HTML error page instead of a specific error message.'
            : (error.message || 'No technical details available.');
            
        errorDetails = el('pre', { className: 'error-details' }, [
            el('strong', {}, ['Error Reported by Browser:']),
            `\n${errorMessage}`
        ]);
    }

    const errorView = el('div', { className: 'error-container' }, [
        el('h2', {}, ['Backend Server Error']),
        el('p', {}, [
            "The application can't load data because the backend server at ",
            el('code', {}, ['smartschool-online.onrender.com']),
            " is encountering a critical issue (likely a 500 Internal Server Error)."
        ]),
        el('div', { className: 'error-suggestion' }, [
            el('strong', {}, ['What to do next:']),
            "The server process has likely crashed. To fix this, you need to check the server logs on your hosting platform (e.g., Render.com) to see the specific error that caused the failure."
        ]),
        errorDetails,
        retryBtn
    ]);
    
    appContainer.innerHTML = '';
    appContainer.appendChild(errorView);
};

const init = async () => {
    try {
        const loadedState = await api.loadInitialState();
        const isLiveMode = localStorage.getItem('smartschool_liveMode') === 'true';
        const aiProvider = localStorage.getItem('smartschool_aiProvider') || 'gemini';
        const openAiApiKey = localStorage.getItem('smartschool_openAiApiKey') || null;

        // Combine all initial state setup into a single call for efficiency.
        setState({
            ...loadedState,
            isLiveMode,
            aiProvider,
            openAiApiKey,
        });
        
        document.addEventListener('state-change', (e) => {
            const detail = (e as CustomEvent).detail;
            // Use optional chaining for robustness in case detail is undefined.
            if (detail?.rerender) {
                renderApp();
            }
        });

        renderApp();
    } catch(error) {
        console.error('Initialization failed:', error);
        renderErrorView(init, error);
    }
};

document.addEventListener('DOMContentLoaded', init);