/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Creates an HTML element.
 * @param {keyof HTMLElementTagNameMap} tag The HTML tag name.
 * @param {object} attributes A key-value object of attributes and properties.
 * @param {(Node | string | null | undefined)[]} children An array of child nodes or strings.
 * @returns {HTMLElement} The created HTMLElement.
 */
export const el = (
    tag,
    attributes = {},
    children = []
) => {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key in element) {
            try {
                element[key] = value;
            } catch (e) {
                element.setAttribute(key, value);
            }
        } else {
            element.setAttribute(key, String(value));
        }
    });

    children.forEach(child => {
        if (child === null || child === undefined) return;
        element.append(typeof child === 'string' ? document.createTextNode(child) : child);
    });

    return element;
};

/**
 * A helper to clear a container and append new children.
 * @param {HTMLElement | null} container The container element.
 * @param {(Node | string)[]} children The children to append.
 */
export const renderChildren = (container, children) => {
    if (!container) return;
    container.innerHTML = '';
    children.forEach(child => {
         if (child === null || child === undefined) return;
         container.append(typeof child === 'string' ? document.createTextNode(child) : child);
    });
};

/**
 * A very simple Markdown to DOM nodes converter.
 * Supports **bold** and newlines.
 * @param {string} text The markdown text.
 * @returns {Node[]} An array of nodes.
 */
export const simpleMarkdownToNodes = (text) => {
    const fragment = document.createDocumentFragment();
    if (!text) return Array.from(fragment.childNodes);
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        if (index > 0) {
            fragment.appendChild(el('br'));
        }
        // Split by **bold** tags, keeping the delimiters
        const parts = line.split(/(\*\*.*?\*\*)/g).filter(p => p);
        
        parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                fragment.appendChild(el('strong', {}, [part.slice(2, -2)]));
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });
    });
    return Array.from(fragment.childNodes);
};

/**
 * Shows a toast message.
 * @param {string} message The message to display.
 * @param {'success' | 'error' | 'info'} type The type of toast.
 */
export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = el('div', { className: `toast toast-${type}`, role: 'alert', 'aria-live': 'assertive' });
    toast.innerHTML = message; // Using innerHTML here for simple internal messages

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
};

/**
 * Shows a spinner overlay on a container.
 * @param {string} containerSelector CSS selector for the container.
 */
export const showSpinner = (containerSelector) => {
    const container = document.querySelector(containerSelector);
    if (container) {
        const spinner = container.querySelector(':scope > .spinner-overlay');
        if(spinner) spinner.classList.add('active');
    }
}

/**
 * Hides a spinner overlay on a container.
 * @param {string} containerSelector CSS selector for the container.
 */
export const hideSpinner = (containerSelector) => {
    const container = document.querySelector(containerSelector);
     if (container) {
        const spinner = container.querySelector(':scope > .spinner-overlay');
        if(spinner) spinner.classList.remove('active');
    }
}

/**
 * Creates and shows a custom confirmation modal.
 * @param {string} message The confirmation message.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise.
 */
export const createConfirmationModal = (message) => {
    return new Promise((resolve) => {
        const modal = el('div', { className: 'modal-overlay confirmation-modal visible' }, [
            el('div', { className: 'modal-content', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'confirmation-title' }, [
                el('h3', { id: 'confirmation-title' }, ['Confirm Action']),
                el('p', {}, [message]),
                el('div', { className: 'confirmation-modal-actions' }, [
                    el('button', { className: 'btn btn-secondary' }, ['Cancel']),
                    el('button', { className: 'btn btn-danger' }, ['Confirm'])
                ])
            ])
        ]);

        const closeModal = (result) => {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 300);
        };

        modal.querySelector('.btn-secondary').addEventListener('click', () => closeModal(false));
        modal.querySelector('.btn-danger').addEventListener('click', () => closeModal(true));
        
        document.body.appendChild(modal);
    });
};
