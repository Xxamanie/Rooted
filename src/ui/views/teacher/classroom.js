/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, simpleMarkdownToNodes, showToast, showSpinner, hideSpinner } from "../../dom-utils.js";
import { getState, setState } from "../../../state.js";
import { api } from "../../../api.js";
import { aiService } from "../../../services/ai.js";

const populateClassSelector = (selectElement) => {
    const { students } = getState();
    const classes = [...new Set(students.map(s => s.class))].sort();
    const originalValue = selectElement.value;
    selectElement.innerHTML = '';
    selectElement.appendChild(el('option', { value: '', textContent: '-- Select Class --' }));
    classes.forEach(className => {
        selectElement.appendChild(el('option', { value: className, textContent: className }));
    });
    if (originalValue) selectElement.value = originalValue;
};

const renderAttendanceList = (className, container) => {
    const { students, attendanceRecords } = getState();
    const studentsInClass = students.filter(s => s.class === className);
    if (studentsInClass.length === 0) {
        renderChildren(container, [el('p', {}, ['No students in this class.'])]);
        return;
    }

    const today = new Date().toLocaleDateString();
    const todaysRecord = attendanceRecords.find(r => r.date === today && r.class === className);

    const attendanceItems = studentsInClass.map(student => {
        const studentStatus = todaysRecord?.records.find(r => r.studentId === student.id)?.status || 'Present';
        const buttonGroup = el('div', { className: 'attendance-status-buttons' }, [
            el('button', { className: `present ${studentStatus === 'Present' ? 'active' : ''}`, 'data-status': 'Present' }, ['P']),
            el('button', { className: `late ${studentStatus === 'Late' ? 'active' : ''}`, 'data-status': 'Late' }, ['L']),
            el('button', { className: `absent ${studentStatus === 'Absent' ? 'active' : ''}`, 'data-status': 'Absent' }, ['A'])
        ]);
        
        buttonGroup.addEventListener('click', (e) => {
            if (e.target.matches('button')) {
                buttonGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });

        return el('div', { className: 'attendance-item', 'data-student-id': student.id }, [
            el('span', { className: 'student-name' }, [student.name]),
            buttonGroup
        ]);
    });
    
    renderChildren(container, attendanceItems);
};

const renderAnnouncements = (container) => {
    const { announcements } = getState();
    if (announcements.length === 0) {
        renderChildren(container, [el('p', {}, ['No announcements yet.'])]);
        return;
    }
    const announcementElements = announcements.map(a => el('div', { className: 'announcement-card' }, [
        el('p', { textContent: a.text }),
        el('div', { className: 'timestamp', textContent: a.date })
    ]));
    renderChildren(container, announcementElements);
};

// Functions related to essay modals
let essayModal;

export const hideViewEssayModal = () => {
    if (essayModal) {
        essayModal.classList.remove('visible');
        setTimeout(() => essayModal.remove(), 300);
        essayModal = null;
    }
};

const handleAIAssistedGrade = async (assignmentId, studentId, feedbackBox, scoreInput, feedbackInput, aiButton) => {
    const { essayAssignments, essaySubmissions } = getState();
    const assignment = essayAssignments.find(a => a.id === assignmentId);
    const submission = essaySubmissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
    if (!assignment || !submission) return;

    aiButton.disabled = true;
    showSpinner('.ai-grading-section');
    feedbackBox.innerHTML = ''; // Clear initial text
    
    const result = await aiService.gradeEssay(assignment.prompt, submission.submissionText);
    
    if (result) {
        const feedbackElements = [
            ...simpleMarkdownToNodes(result.feedback),
            el('strong', { className: 'suggested-score' }, [`Suggested Score: ${result.suggestedScore} / 100`])
        ];
        renderChildren(feedbackBox, feedbackElements);
        scoreInput.value = result.suggestedScore;
        feedbackInput.value = result.feedback;
    } else {
        renderChildren(feedbackBox, [el('p', { style: { color: 'red' } }, ['Failed to get AI feedback.'])]);
    }

    hideSpinner('.ai-grading-section');
    aiButton.disabled = false;
};

const handleSaveEssayGrade = async (assignmentId, studentId) => {
    const scoreInput = essayModal.querySelector('#final-essay-score');
    const feedbackInput = essayModal.querySelector('#final-essay-feedback');

    if (!scoreInput.value) {
        showToast('Please enter a final score.', 'error');
        return;
    }
    const score = parseInt(scoreInput.value, 10);

    await api.updateEssayFeedback(assignmentId, studentId, feedbackInput.value, score);
    showToast('Grade saved successfully!', 'success');
    hideViewEssayModal();
    document.dispatchEvent(new CustomEvent('render-view'));
};

const renderViewAndGradeEssayModal = (assignmentId, studentId) => {
    const { essayAssignments, essaySubmissions } = getState();
    const assignment = essayAssignments.find(a => a.id === assignmentId);
    const submission = essaySubmissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
    if (!assignment || !submission) return;
    
    const feedbackBox = el('div', { className: 'ai-grading-feedback-box' }, ['Click "Run AI Analysis" to get feedback and a suggested score.']);
    const finalScoreInput = el('input', { type: 'number', id: 'final-essay-score', className: 'form-group', value: (submission.score ?? '').toString(), min: '0', max: '100', required: true });
    const finalFeedbackInput = el('textarea', { id: 'final-essay-feedback', className: 'form-group', rows: 3, textContent: submission.feedback ?? '' });

    const aiButton = el('button', { className: 'btn btn-secondary', style: { width: 'auto', padding: '5px 10px', fontSize: '14px', marginLeft: '10px' } }, ['Run AI Analysis']);
    aiButton.addEventListener('click', () => handleAIAssistedGrade(assignmentId, studentId, feedbackBox, finalScoreInput, finalFeedbackInput, aiButton));
    
    const gradeForm = el('form', {}, [
        el('div', { className: 'form-row' }, [
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'final-essay-score' }, ['Final Score (0-100)']),
                finalScoreInput
            ])
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'final-essay-feedback' }, ['Feedback for Student']),
            finalFeedbackInput
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Save Final Grade'])
    ]);
    gradeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveEssayGrade(assignmentId, studentId);
    });

    const aiGradingSection = el('div', { className: 'ai-grading-section', style: { position: 'relative' } }, [
        el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
        el('div', { className: 'ai-grading-feedback' }, [
            el('h5', {}, ['AI-Assisted Grading ', aiButton]),
            feedbackBox
        ]),
    ]);

    const modalContent = el('div', { className: 'modal-content', style: { maxWidth: '800px' } }, [
        el('button', { className: 'modal-close-btn' }, ['×']),
        el('h3', {}, [`Essay: ${assignment.title}`]),
        el('p', {}, [el('strong', {}, ['Student: ']), submission.studentName]),
        el('hr'),
        el('h4', {}, ['Student\'s Submission']),
        el('div', { className: 'management-list', style: { maxHeight: '200px', overflowY: 'auto', background: '#f8f9fa', padding: '15px', borderRadius: '8px', whiteSpace: 'pre-wrap' } }, [submission.submissionText]),
        aiGradingSection,
        el('hr'),
        el('h4', {}, ['Final Grade & Feedback']),
        gradeForm
    ]);

    essayModal = el('div', { className: 'modal-overlay' }, [modalContent]);
    essayModal.querySelector('.modal-close-btn').addEventListener('click', hideViewEssayModal);
    setTimeout(() => essayModal.classList.add('visible'), 10);
    return essayModal;
};

export const renderStudentViewEssayModal = (assignmentId) => {
     const { essayAssignments, essaySubmissions, currentStudent } = getState();
     const assignment = essayAssignments.find(a => a.id === assignmentId);
     const submission = essaySubmissions.find(s => s.assignmentId === assignmentId && s.studentId === currentStudent?.id);
     if (!assignment) return;

    const handleSubmitEssay = async (e) => {
        e.preventDefault();
        const textarea = essayModal.querySelector('textarea');
        if (!textarea.value.trim()) {
            showToast('Your essay cannot be empty.', 'error');
            return;
        }

        await api.addEssaySubmission({
            assignmentId: assignmentId,
            studentId: currentStudent.id,
            submissionText: textarea.value
        });
        
        showToast('Essay submitted successfully!', 'success');
        hideViewEssayModal();
        document.dispatchEvent(new CustomEvent('state-change', { detail: { rerender: true }}));
    };

    let modalElements;
    if (submission) {
        modalElements = [
            el('h3', {}, [assignment.title]),
            el('p', {}, [el('strong', {}, ['Prompt: ']), assignment.prompt]),
            el('hr'),
            el('h4', {}, ['Your Submission']),
            el('div', { className: 'management-list', style: { background: '#f8f9fa', padding: '15px', borderRadius: '8px', whiteSpace: 'pre-wrap' } }, [submission.submissionText]),
            submission.feedback ? el('div', {}, [
                el('hr'),
                el('h4', {}, ['Teacher\'s Feedback']),
                el('div', { className: 'ai-grading-feedback-box' }, [submission.feedback]),
                el('p', { style: { fontWeight: 'bold', fontSize: '1.2em', marginTop: '15px' } }, [`Final Score: ${submission.score}/100`])
            ]) : el('p', { style: { marginTop: '15px', fontStyle: 'italic' } }, ['Your submission is awaiting feedback.'])
        ];
    } else {
        const submitForm = el('form', {}, [
             el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'student-essay-textarea' }, ['Your Essay']),
                el('textarea', { id: 'student-essay-textarea', rows: 15, className: 'form-group', required: true })
            ]),
            el('button', { type: 'submit', className: 'btn' }, ['Submit Essay'])
        ]);
        submitForm.addEventListener('submit', handleSubmitEssay);
        modalElements = [
            el('h3', {}, [assignment.title]),
            el('p', {}, [el('strong', {}, ['Prompt: ']), assignment.prompt]),
            el('hr'),
            submitForm
        ];
    }
    
    const modalContent = el('div', { className: 'modal-content', style: { maxWidth: '800px' } }, [
        el('button', { className: 'modal-close-btn' }, ['×']),
        ...modalElements
    ]);
    essayModal = el('div', { className: 'modal-overlay' }, [modalContent]);
    essayModal.querySelector('.modal-close-btn').addEventListener('click', hideViewEssayModal);
    setTimeout(() => essayModal.classList.add('visible'), 10);
    return essayModal;
};


export const renderClassroomView = () => {
    // --- State and variables ---
    const { essayAssignments, essaySubmissions, students, resources, currentUser } = getState();
    const attendanceClassSelect = el('select');
    const attendanceListContainer = el('div', {}, [el('p', {}, ['Select a class to see student list.'])]);
    const announcementListContainer = el('div', { className: 'scrollable-list' });
    const essayClassSelect = el('select');
    const essayAssignmentSelect = el('select');
    const essaySubmissionsContainer = el('div', { className: 'scrollable-list' }, [el('p', { className: 'placeholder-text' }, ['Select an assignment to view submissions.'])]);
    const resourceListContainer = el('div', { className: 'scrollable-list' });

    // --- Render Functions ---
    const renderResourceList = () => {
        if (resources.length === 0) {
            renderChildren(resourceListContainer, [el('p', { className: 'placeholder-text' }, ['No resources uploaded yet.'])]);
            return;
        }

        const resourceElements = resources.map(res => {
            const icon = res.type === 'link' ? '🔗' : '📄';
            const removeBtn = el('button', {className: 'btn btn-danger'}, ['Del']);
            removeBtn.addEventListener('click', async () => {
                await api.removeResource(res.id);
                renderResourceList();
                showToast('Resource removed.', 'success');
            });

            return el('div', { className: 'resource-item'}, [
                el('span', {className: 'resource-icon'}, [icon]),
                el('div', {className: 'resource-details'}, [
                    el('a', {href: res.content, target: '_blank', title: res.fileName || res.content}, [res.title]),
                    el('p', {}, [`${res.subject} | For: ${res.className}`])
                ]),
                removeBtn
            ]);
        });
        renderChildren(resourceListContainer, resourceElements);
    };

    const renderEssaySubmissions = (assignmentId) => {
        if (!assignmentId) {
            renderChildren(essaySubmissionsContainer, [el('p', { className: 'placeholder-text' }, ['Select an assignment to view submissions.'])]);
            return;
        }

        const submissionsForAssignment = essaySubmissions.filter(s => s.assignmentId === assignmentId);

        if (submissionsForAssignment.length === 0) {
            renderChildren(essaySubmissionsContainer, [el('p', { className: 'placeholder-text' }, ['No submissions received for this assignment yet.'])]);
            return;
        }

        const submissionElements = submissionsForAssignment.map(submission => {
            const student = students.find(s => s.id === submission.studentId);
            if (!student) return null; // Skip if student data is missing

            const statusElement = submission.score !== undefined
                ? el('span', { className: 'status graded' }, [`Graded: ${submission.score}/100`])
                : el('span', { className: 'status submitted' }, ['Submitted']);
            
            const actionButton = el('button', { className: 'btn btn-secondary', 'data-assignment-id': assignmentId, 'data-student-id': student.id }, ['View & Grade']);
            
            actionButton.addEventListener('click', () => {
                document.body.appendChild(renderViewAndGradeEssayModal(assignmentId, student.id));
            });

            return el('div', { className: 'submission-item' }, [
                el('div', { className: 'submission-info' }, [
                    el('span', { className: 'student-name' }, [student.name]),
                    statusElement
                ]),
                el('div', { className: 'submission-actions' }, [actionButton])
            ]);
        }).filter(Boolean); // Filter out nulls
        
        renderChildren(essaySubmissionsContainer, submissionElements);
    };

    const renderEssayAssignmentSelector = () => {
        const originalValue = essayAssignmentSelect.value;
        essayAssignmentSelect.innerHTML = '';
        essayAssignmentSelect.appendChild(el('option', { value: '' }, ['-- Select an Assignment --']));
        
        essayAssignments.sort((a, b) => a.title.localeCompare(b.title)).forEach(assignment => {
            essayAssignmentSelect.appendChild(el('option', { value: assignment.id, textContent: `${assignment.title} (${assignment.className})`}));
        });

        if (originalValue) essayAssignmentSelect.value = originalValue;
        renderEssaySubmissions(essayAssignmentSelect.value);
    };

    // --- Event Handlers ---
    const handleAddResource = (e) => {
        e.preventDefault();
        const form = e.target;
        const fileInput = form.querySelector('#resource-file');
        const linkInput = form.querySelector('#resource-link');
        const file = fileInput.files[0];

        const resourceData = {
            teacherId: currentUser.id,
            title: form.querySelector('#resource-title').value,
            subject: form.querySelector('#resource-subject').value,
            className: form.querySelector('#resource-class-select').value,
        };

        if (!resourceData.title || !resourceData.subject || !resourceData.className) {
            showToast('Please fill out all fields.', 'error');
            return;
        }

        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                await api.addResource({
                    ...resourceData,
                    type: 'file',
                    content: event.target.result,
                    fileName: file.name
                });
                showToast('File resource uploaded!', 'success');
                renderResourceList();
                form.reset();
            };
            reader.readAsDataURL(file);
        } else if (linkInput.value) {
            api.addResource({
                ...resourceData,
                type: 'link',
                content: linkInput.value
            }).then(() => {
                showToast('Link resource added!', 'success');
                renderResourceList();
                form.reset();
            });
        } else {
            showToast('Please provide a file or a link.', 'error');
        }
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        const form = e.target;
        const textInput = form.querySelector('textarea');
        if (!textInput.value) return;
        
        showToast('Posting announcement...', 'info');
        await api.postAnnouncement(textInput.value);
        renderAnnouncements(announcementListContainer);
        showToast('Announcement posted!', 'success');
        form.reset();
    };

    const handleSaveAttendance = async () => {
        const className = attendanceClassSelect.value;
        if (!className) return;

        const records = [];
        attendanceListContainer.querySelectorAll('.attendance-item').forEach(item => {
            const studentId = item.dataset.studentId;
            const activeBtn = item.querySelector('.attendance-status-buttons button.active');
            const status = activeBtn ? activeBtn.dataset.status : 'Absent';
            if (studentId && status) {
                records.push({ studentId, status });
            }
        });

        showToast('Saving attendance...', 'info');
        await api.saveAttendance(className, records);
        showToast(`Attendance for ${className} saved!`, 'success');
    };
    
    const handleCreateEssay = async (e) => {
        e.preventDefault();
        const form = e.target;
        const titleInput = form.querySelector('#essay-title');
        const classSelect = form.querySelector('#essay-class-select');
        const promptInput = form.querySelector('#essay-prompt');

        if (!titleInput.value || !classSelect.value || !promptInput.value) {
            showToast('Please fill all fields.', 'error');
            return;
        }

        await api.addEssayAssignment({
            title: titleInput.value,
            className: classSelect.value,
            prompt: promptInput.value,
        });
        
        renderEssayAssignmentSelector();
        showToast('Essay assignment created!', 'success');
        form.reset();
    };

    // --- Element Creation ---
    populateClassSelector(attendanceClassSelect);
    populateClassSelector(essayClassSelect);
    renderAnnouncements(announcementListContainer);
    renderEssayAssignmentSelector();
    renderResourceList();
    
    attendanceClassSelect.addEventListener('change', (e) => {
        renderAttendanceList(e.target.value, attendanceListContainer);
        saveAttendanceBtn.style.display = e.target.value ? 'block' : 'none';
    });
    
    essayAssignmentSelect.addEventListener('change', (e) => renderEssaySubmissions(e.target.value));

    const saveAttendanceBtn = el('button', { className: 'btn', style: { display: 'none', marginTop: '20px' } }, ['Save Attendance']);
    saveAttendanceBtn.addEventListener('click', handleSaveAttendance);

    const announcementForm = el('form', {}, [
        el('div', { className: 'form-group' }, [
            el('textarea', { placeholder: 'Type your announcement here...', required: true })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Post to All'])
    ]);
    announcementForm.addEventListener('submit', handlePostAnnouncement);

    const createEssayForm = el('form', {}, [
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'essay-title' }, ['Assignment Title']),
            el('input', { type: 'text', id: 'essay-title', placeholder: "e.g., Thematic Analysis of 'Hamlet'", required: true })
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'essay-class-select' }, ['Assign to Class']),
            essayClassSelect
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'essay-prompt' }, ['Essay Prompt']),
            el('textarea', { id: 'essay-prompt', rows: 4, placeholder: 'Enter the full essay prompt or question for the students.', required: true })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Create Assignment'])
    ]);
    createEssayForm.addEventListener('submit', handleCreateEssay);

    const resourceClassSelect = el('select', {id: 'resource-class-select'});
    populateClassSelector(resourceClassSelect);

    const resourceForm = el('form', {id: 'resource-form'}, [
        el('div', {className: 'form-group'}, [ el('input', {type: 'text', id: 'resource-title', placeholder: 'Resource Title', required: true}) ]),
        el('div', {className: 'form-row'}, [
            el('div', {className: 'form-group'}, [ el('input', {type: 'text', id: 'resource-subject', placeholder: 'Subject', required: true}) ]),
            el('div', {className: 'form-group'}, [ resourceClassSelect ]),
        ]),
        el('div', {className: 'form-group'}, [ el('input', {type: 'file', id: 'resource-file'}) ]),
        el('div', {className: 'form-group'}, [ el('input', {type: 'url', id: 'resource-link', placeholder: 'Or paste a link here'}) ]),
        el('button', {type: 'submit', className: 'btn'}, ['Add Resource'])
    ]);
    resourceForm.addEventListener('submit', handleAddResource);


    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'classroom-grid' }, [
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Post Announcement']),
                announcementForm,
                el('hr'),
                el('h4', { style: { marginTop: '20px' } }, ['Take Attendance']),
                el('div', { className: 'form-group' }, [
                    el('label', { htmlFor: 'attendance-class-select' }, ['Select Class']),
                    attendanceClassSelect
                ]),
                attendanceListContainer,
                saveAttendanceBtn
            ]),
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Class Resources Hub']),
                resourceForm,
                el('hr'),
                el('h5', {}, ['Uploaded Resources']),
                resourceListContainer
            ])
        ]),
        el('div', { className: 'admin-grid-large', style: { marginTop: '25px' } }, [
             el('div', { className: 'management-card' }, [
                el('h3', {}, ['AI Co-pilot: Essay Grading']),
                el('div', {}, [
                    el('div', { className: 'form-group' }, [
                        el('label', { htmlFor: 'essay-assignment-select' }, ['Select Assignment to Grade']),
                        essayAssignmentSelect
                    ]),
                    essaySubmissionsContainer
                ]),
                el('hr', { style: { margin: '25px 0' } }),
                el('h4', {}, ['Create New Essay Assignment']),
                createEssayForm
            ]),
            el('div', { className: 'management-card' }, [
                 el('h4', {}, ['Recent Announcements']),
                announcementListContainer
            ])
        ])
    ]);
    
    document.addEventListener('state-change', () => {
        // Re-render relevant parts if this view is active
        if (document.body.contains(view)) {
             renderAnnouncements(announcementListContainer);
             renderEssayAssignmentSelector();
             renderEssaySubmissions(essayAssignmentSelect.value);
             renderResourceList();
        }
    });

    return view;
};