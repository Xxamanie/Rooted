
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

const renderErrorView = (message, retryHandler, error = null) => {
    if (!appContainer) return;
    const retryBtn = el('button', { className: 'btn' }, ['Retry']);
    retryBtn.addEventListener('click', retryHandler);

    let errorDetails = null;
    if (error) {
        // If the error message is a full HTML page, it's not useful to display.
        // Let's show a cleaner message in that case.
        const errorMessage = (error.message && error.message.trim().toLowerCase().startsWith('<!doctype html'))
            ? 'The server returned an HTML error page. Please check the server logs for the specific error details.'
            : (error.stack || error.message || 'No technical details available.');
            
        errorDetails = el('pre', { className: 'error-details' }, [
            el('strong', {}, ['Technical Details:']),
            `\n${errorMessage}`
        ]);
    }

    const errorView = el('div', { className: 'error-container' }, [
        el('h2', {}, ['Oops! Something went wrong']),
        el('p', {}, [message]),
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
        const friendlyMessage = "We couldn't load the application data from the server. This could be a temporary issue or a problem with the backend service.";
        renderErrorView(friendlyMessage, init, error);
    }
};

document.addEventListener('DOMContentLoaded', init);