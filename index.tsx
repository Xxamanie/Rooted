import { api } from './src/api.js';
import { getState, setState } from './src/state.js';
import { renderLoginView } from './src/ui/views/login.js';
import { renderTeacherShell } from './src/ui/views/teacher-shell.js';
import { renderStudentPortal } from './src/ui/views/student-portal.js';
import { renderParentPortal } from './src/ui/views/parent-portal.js';
import { el } from './src/ui/dom-utils.js';

const appContainer = document.getElementById('app');

// ✅ GEMINI API KEY CHECK
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error("Gemini API key not found!");
} else {
  console.log("Gemini API key loaded successfully.");
}

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

    const isVercelKvError = error?.message?.includes('@vercel/kv') || error?.message?.includes('KV_REST_API_TOKEN');

    let title, primaryMessage, suggestionTitle, suggestionText, fixSteps, isWarning;

    if (isVercelKvError) {
        title = 'Backend Configuration Error';
        primaryMessage = "The application failed to connect to its backend database (Vercel KV). This is a server-side configuration issue, not a problem with this frontend application.";
        suggestionTitle = 'Missing Environment Variables';
        suggestionText = [
            "The server is missing required environment variables to connect to its database. The error indicates that ",
            el('code', {}, ['KV_REST_API_URL']), " and ", el('code', {}, ['KV_REST_API_TOKEN']), " are not set."
        ];
        fixSteps = [
            el('li', {}, ["Go to your project's dashboard on your hosting platform (e.g., Vercel, Render)."]),
            el('li', {}, ["Navigate to the 'Environment Variables' section in your project settings."]),
            el('li', {}, ["Add ", el('code', {}, ['KV_REST_API_URL']), " and ", el('code', {}, ['KV_REST_API_TOKEN']), " with the correct values from your Vercel KV database."]),
            el('li', {}, ["If you haven't set up Vercel KV yet, create one in the Vercel dashboard and copy the provided environment variable snippets."]),
            el('li', {}, ["Redeploy your backend service for the changes to take effect."]),
            el('li', {}, ["Once the backend is redeployed, click the 'Retry' button below."])
        ];
        isWarning = true;
    } else {
        // Default 500 error content
        title = 'Backend Connection Failed';
        primaryMessage = "The application received a '500 Internal Server Error' from the backend. This indicates a problem with the server's code, not with this frontend application.";
        suggestionTitle = 'Understanding the 500 Error';
        suggestionText = [
             "A 500 error means the server encountered an unexpected problem while trying to fulfill the request for initial data from the ",
            el('code', {}, ['/api/bootstrap']),
            " endpoint. This is not a frontend bug or a network issue."
        ];
        fixSteps = [
            el('li', {}, ["The definitive solution is to ", el('strong', {}, ['check the server logs.']), " On your hosting platform (e.g., Render.com), inspect the logs for the ", el('code', {}, ['smartschool-online']), " service to find the detailed error or stack trace."]),
            el('li', {}, ["As a first step, you can also check your browser's DevTools (F12) ", el('strong', {}, ['Network']), " tab. Find the failed request (it will be red) and inspect its 'Response' tab for any clues."]),
            el('li', {}, ["Once the backend issue is resolved, click the 'Retry' button below."])
        ];
        isWarning = false;
    }

    const errorSuggestion1 = el('div', { className: `error-suggestion ${isWarning ? 'warning' : ''}` }, [
        el('strong', {}, [suggestionTitle]),
        ...suggestionText
    ]);

    const errorView = el('div', { className: 'error-container' }, [
        el('h2', {}, [title]),
        el('p', {}, [primaryMessage]),
        errorSuggestion1,
        el('div', { className: 'error-suggestion' }, [
            el('strong', {}, ['How to Fix This (for Developers):']),
            el('ol', {}, fixSteps)
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
            const detail = (e).detail;
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
