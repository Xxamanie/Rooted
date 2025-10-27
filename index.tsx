import { api } from './src/api.js';
import { getState, setState } from './src/state.js';
import { renderLoginView } from './src/ui/views/login.js';
import { renderTeacherShell } from './src/ui/views/teacher-shell.js';
import { renderStudentPortal } from './src/ui/views/student-portal.js';
import { renderParentPortal } from './src/ui/views/parent-portal.js';
import { el } from './src/ui/dom-utils.js';

const appContainer = document.getElementById('app');

const renderBroadcastBanner = () => {
    const broadcast = api.getBroadcastMessage();
    if (broadcast) {
        const banner = el('div', { className: 'broadcast-banner' }, [
            el('span', {}, [broadcast.message]),
            el('button', { className: 'close-broadcast-btn' }, ['×'])
        ]);
        banner.querySelector('.close-broadcast-btn').addEventListener('click', () => {
            api.clearBroadcastMessage();
            banner.remove();
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

const init = async () => {
    const loadedState = await api.loadInitialState();
    const apiKey = localStorage.getItem('smartschool_apiKey');
    const isLiveMode = localStorage.getItem('smartschool_liveMode') === 'true';

    // Combine all initial state setup into a single call for efficiency.
    setState({
        ...loadedState,
        apiKey,
        isLiveMode,
    });
    
    document.addEventListener('state-change', (e) => {
        const detail = (e as CustomEvent).detail;
        // Use optional chaining for robustness in case detail is undefined.
        if (detail?.rerender) {
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