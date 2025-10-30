/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el } from "../dom-utils.js";
import { api } from "../../api.js";
import { showToast } from "../dom-utils.js";

const createCinematicDisplay = () => {
    const capabilities = [
        "AI-Powered Lesson Planning",
        "Automated Quiz Generation",
        "Intelligent Student Analytics",
        "Seamless Parent & Student Portals",
        "Proctored Online Examinations",
        "Personalized AI Study Buddy"
    ];
    let currentIndex = 0;

    const cinematicText = el('h1', { className: 'cinematic-text' }, [capabilities[currentIndex]]);

    // Set an interval to cycle through the capabilities
    setInterval(() => {
        currentIndex = (currentIndex + 1) % capabilities.length;
        
        cinematicText.classList.remove('cinematic-text-animate');
        
        setTimeout(() => {
            cinematicText.textContent = capabilities[currentIndex];
            cinematicText.classList.add('cinematic-text-animate');
        }, 50);

    }, 4000);

    // Trigger the initial animation
    setTimeout(() => cinematicText.classList.add('cinematic-text-animate'), 100);

    return el('div', { className: 'cinematic-container' }, [
        el('div', { className: 'cinematic-text-wrapper' }, [cinematicText]),
        el('p', { className: 'cinematic-footer' }, ['contact us to join our community of smart virtual school data documentation and AI assisted analysis'])
    ]);
};

export const renderLoginView = () => {
    const handleTeacherLogin = async (e) => {
        e.preventDefault();
        const form = e.target;
        const schoolCodeInput = form.querySelector('#login-school-code');
        const staffIdInput = form.querySelector('#login-staff-id');
        const loginError = document.getElementById('teacher-login-error');
        
        const user = await api.teacherLogin(schoolCodeInput.value, staffIdInput.value);

        if (user) {
            showToast(`Welcome, ${user.name}!`, 'success');
        } else {
            if (loginError) {
                loginError.textContent = 'Invalid School Code or Staff ID. Please try again.';
                loginError.style.display = 'block';
            }
        }
    };

    const handleStudentLogin = async (e) => {
        e.preventDefault();
        const form = e.target;
        const studentIdInput = form.querySelector('#login-student-id');
        const accessCodeInput = form.querySelector('#login-access-code');
        const loginError = document.getElementById('student-login-error');

        const student = await api.studentLogin(studentIdInput.value, accessCodeInput.value);

        if(student) {
            showToast(`Welcome, ${student.name}!`, 'success');
        } else {
             if (loginError) {
                loginError.textContent = 'Invalid Student ID or Access Code. Please try again.';
                loginError.style.display = 'block';
            }
        }
    };

    const handleParentLogin = async (e) => {
        e.preventDefault();
        const form = e.target;
        const parentIdInput = form.querySelector('#login-parent-id');
        const accessCodeInput = form.querySelector('#login-parent-access-code');
        const loginError = document.getElementById('parent-login-error');

        const parent = await api.parentLogin(parentIdInput.value, accessCodeInput.value);

        if (parent) {
            showToast(`Welcome, ${parent.name}!`, 'success');
        } else {
            if (loginError) {
                loginError.textContent = 'Invalid Parent ID or Access Code. Please try again.';
                loginError.style.display = 'block';
            }
        }
    };
    
    // Create elements for the teacher form that need dynamic updates
    const staffIdLabel = el('label', { htmlFor: 'login-staff-id' }, ['Staff ID']);
    const staffIdInput = el('input', { type: 'text', id: 'login-staff-id', required: true, placeholder: 'e.g. SID-8431' });
    const schoolCodeInput = el('input', { type: 'text', id: 'login-school-code', required: true, placeholder: 'e.g. SMRT-A4B8' });
    
    // Add dynamic behavior for Creator login
    schoolCodeInput.addEventListener('input', (e) => {
        const isCreatorCode = e.target.value.toLowerCase() === 'xxamanie';
        if (isCreatorCode) {
            staffIdLabel.textContent = 'Creator Password';
            staffIdInput.type = 'password';
            staffIdInput.placeholder = 'Enter creator password';
        } else {
            staffIdLabel.textContent = 'Staff ID';
            staffIdInput.type = 'text';
            staffIdInput.placeholder = 'e.g. SID-8431';
        }
    });

    const teacherForm = el('form', { id: 'teacher-login-form', className: 'login-form active' }, [
        el('h3', {}, ['Teacher Login']),
        el('div', { id: 'teacher-login-error', className: 'login-error-message', style: { display: 'none' } }),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'login-school-code' }, ['School Code']),
            schoolCodeInput
        ]),
        el('div', { className: 'form-group' }, [
            staffIdLabel,
            staffIdInput
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Login'])
    ]);
    teacherForm.addEventListener('submit', handleTeacherLogin);

    const studentForm = el('form', { id: 'student-login-form', className: 'login-form' }, [
        el('h3', {}, ['Student Login']),
        el('div', { id: 'student-login-error', className: 'login-error-message', style: { display: 'none' } }),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'login-student-id' }, ['Student ID']),
            el('input', { type: 'text', id: 'login-student-id', required: true, placeholder: 'e.g. STU-0012' })
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'login-access-code' }, ['Access Code']),
            el('input', { type: 'password', id: 'login-access-code', required: true, placeholder: 'Enter your access code' })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Login'])
    ]);
    studentForm.addEventListener('submit', handleStudentLogin);

    const parentForm = el('form', { id: 'parent-login-form', className: 'login-form' }, [
        el('h3', {}, ['Parent Login']),
        el('div', { id: 'parent-login-error', className: 'login-error-message', style: { display: 'none' } }),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'login-parent-id' }, ['Parent ID']),
            el('input', { type: 'text', id: 'login-parent-id', required: true, placeholder: 'e.g. PAR-123' })
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'login-parent-access-code' }, ['Access Code']),
            el('input', { type: 'password', id: 'login-parent-access-code', required: true, placeholder: 'Enter your access code' })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Login'])
    ]);
    parentForm.addEventListener('submit', handleParentLogin);
    
    const loginTabs = el('div', { className: 'login-tabs' }, [
        el('button', { id: 'teacher-login-tab', className: 'login-tab-btn active', 'data-form': 'teacher-login-form' }, ['Teacher Login']),
        el('button', { id: 'student-login-tab', className: 'login-tab-btn', 'data-form': 'student-login-form' }, ['Student Login']),
        el('button', { id: 'parent-login-tab', className: 'login-tab-btn', 'data-form': 'parent-login-form' }, ['Parent Login'])
    ]);
    
    loginTabs.addEventListener('click', (e) => {
        if (e.target.matches('.login-tab-btn')) {
            const formId = e.target.dataset.form;
            loginTabs.querySelectorAll('.login-tab-btn').forEach(t => t.classList.remove('active'));
            e.target.closest('.login-container').querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(formId)?.classList.add('active');
        }
    });

    const loginContainer = el('div', { className: 'login-container' }, [
        loginTabs,
        teacherForm,
        studentForm,
        parentForm
    ]);

    const cinematicDisplay = createCinematicDisplay();

    return el('div', { id: 'login-page' }, [
        cinematicDisplay,
        el('div', { className: 'login-form-area' }, [
             loginContainer
        ])
    ]);
};