// This is a conceptual router. Since we are re-rendering the whole shell,
// we just need a way to map strings to functions that return views.

// In a more complex SPA, this would handle history, URLs, etc.

let viewRenderers = {};
let currentView = '';

export const registerView = (name, renderer) => {
    viewRenderers[name] = renderer;
};

export const navigateTo = (name) => {
    if (viewRenderers[name]) {
        currentView = name;
        // The actual rendering is triggered by the teacher-shell which calls renderCurrentView
        document.dispatchEvent(new CustomEvent('navigation', { detail: { viewName: name }}));
    } else {
        console.error(`View "${name}" not found.`);
    }
};

export const renderCurrentView = () => {
    if (viewRenderers[currentView]) {
        return viewRenderers[currentView]();
    }
    // Default to dashboard or an error view
    const defaultView = Object.keys(viewRenderers)[0];
    if (viewRenderers[defaultView]) {
        return viewRenderers[defaultView]();
    }
    return document.createElement('div');
};

export const getCurrentView = () => currentView;
