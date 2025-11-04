

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
        const errorMessage = (error.message && error.message.trim().toLowerCase().startsWith('<!doctype html'))
            ? 'The server returned a generic HTML error page instead of a specific error message.'
            : (error.message || 'No technical details available.');
            
        errorDetails = el('pre', { className: 'error-details' }, [
            el('strong', {}, ['Technical Details from Server:']),
            `\n${errorMessage}`
        ]);
    }

    const errorView = el('div', { className: 'error-container' }, [
        el('h2', {}, ['Backend Connection Failed']),
        el('p', {}, [
            "The application received a '500 Internal Server Error' from the backend. This indicates a problem with the server's code, not with this frontend application."
        ]),
        el('div', { className: 'error-suggestion' }, [
            el('strong', {}, ['Understanding the 500 Error']),
            "A 500 error means the server encountered an unexpected problem while trying to fulfill the request for initial data from the ",
            el('code', {}, ['/api/bootstrap']),
            " endpoint. This is not a frontend bug or a network issue."
        ]),
        el('div', { className: 'error-suggestion' }, [
            el('strong', {}, ['How to Fix This (for Developers):']),
            el('ol', {}, [
                el('li', {}, ["The definitive solution is to ", el('strong', {}, ['check the server logs.']), " On your hosting platform (e.g., Render.com), inspect the logs for the ", el('code', {}, ['smartschool-online']), " service to find the detailed error or stack trace."]),
                el('li', {}, ["As a first step, you can also check your browser's DevTools (F12) ", el('strong', {}, ['Network']), " tab. Find the failed request (it will be red) and inspect its 'Response' tab for any clues."]),
                el('li', {}, ["Once the backend issue is resolved, click the 'Retry' button below."])
            ])
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