/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, simpleMarkdownToNodes } from "../dom-utils.js";
import { getState, setState } from "../../state.js";
import { api } from "../../api.js";
import { aiService } from "../../services/ai.js";

// Note: In a larger app, modals would be handled by a global modal service.
// For simplicity, we are re-declaring them here as the student portal is a separate "app".
import { renderViewExamModal, hideViewExamModal } from "./teacher/assessment.js";
import { renderStudentViewEssayModal, hideViewEssayModal } from "./teacher/classroom.js";
import { renderReportCard } from "./teacher/reports.js";


const renderChatHistory = (container, chatHistory) => {
    const { currentStudent } = getState();
    if (!container || !currentStudent) return;
    
    const messageElements = chatHistory.map(message => {
        const isUser = message.role === 'user';
        const avatarChar = isUser ? currentStudent.name.charAt(0).toUpperCase() : '🤖';
        
        const contentDiv = el('div', { className: 'message-content' });
        renderChildren(contentDiv, simpleMarkdownToNodes(message.parts[0].text));

        return el('div', { className: `chat-message ${isUser ? 'user' : 'model'}` }, [
            el('div', { className: 'avatar' }, [avatarChar]),
            contentDiv
        ]);
    });
    
    renderChildren(container, messageElements);
    container.scrollTop = container.scrollHeight;
};

const renderStudyBuddy = (mainContentContainer) => {
    const state = getState();

    const chatMessagesContainer = el('div', { id: 'chat-messages' });

    const setChatLoading = (isLoading) => {
        chatInput.disabled = isLoading;
        chatSendBtn.disabled = isLoading;

        let typingIndicator = chatMessagesContainer.querySelector('.typing-indicator');
        if (isLoading) {
            if (!typingIndicator) {
                typingIndicator = el('div', { className: 'chat-message model typing-indicator' }, [
                    el('div', { className: 'avatar' }, ['🤖']),
                    el('div', { className: 'message-content' }, [
                        el('div', { className: 'dot' }), el('div', { className: 'dot' }), el('div', { className: 'dot' })
                    ])
                ]);
                chatMessagesContainer.appendChild(typingIndicator);
            }
        } else {
            typingIndicator?.remove();
        }
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    };


    const handleChatSubmit = async (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        let { chatHistory, activeChat } = getState();

        const updatedHistory = [...chatHistory, { role: 'user', parts: [{ text: userInput }] }];
        setState({ chatHistory: updatedHistory });
        renderChatHistory(chatMessagesContainer, updatedHistory);
        setChatLoading(true);
        chatForm.reset();

        try {
            if (!activeChat) {
                activeChat = await aiService.startChat();
                if (!activeChat) throw new Error("Could not start chat.");
            }
            
            const result = await activeChat.sendMessageStream({ message: userInput });

            let fullResponse = '';
            // Add placeholder for model response
            let currentFullHistory = [...getState().chatHistory, { role: 'model', parts: [{ text: '' }] }];
            setState({ chatHistory: currentFullHistory });
            
            for await (const chunk of result) {
                fullResponse += chunk.text;
                currentFullHistory = getState().chatHistory;
                currentFullHistory[currentFullHistory.length - 1].parts[0].text = fullResponse;
                // No state update here, just DOM manipulation for performance
                renderChatHistory(chatMessagesContainer, currentFullHistory);
            }

        } catch (error) {
            console.error("Chat error:", error);
            // Revert optimistic user message
            const revertedHistory = getState().chatHistory.slice(0, -1);
            setState({ chatHistory: revertedHistory });
            renderChatHistory(chatMessagesContainer, revertedHistory);
        } finally {
            setChatLoading(false);
            chatInput.focus();
        }
    };

    const chatInput = el('textarea', { id: 'chat-input', placeholder: 'Ask a question about your homework...', required: true });
    const chatSendBtn = el('button', { type: 'submit', id: 'chat-send-btn' }, [
         el('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" }, [
            el('path', { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" })
        ])
    ]);
    const chatForm = el('form', { id: 'chat-form' }, [chatInput, chatSendBtn]);
    chatForm.addEventListener('submit', handleChatSubmit);

    const studyBuddyView = el('div', { className: 'study-buddy-view' }, [
        el('div', { className: 'study-buddy-header' }, [
            el('button', { className: 'btn btn-secondary' }, ['← Back to Dashboard']),
            el('h3', {}, ['Study Buddy'])
        ]),
        el('div', { id: 'chat-container' }, [chatMessagesContainer]),
        chatForm
    ]);

    studyBuddyView.querySelector('.btn-secondary').addEventListener('click', () => {
        mainContentContainer.innerHTML = '';
        mainContentContainer.appendChild(renderStudentDashboard(mainContentContainer));
    });

    // Reset chat state when opening
    let newChatHistory = [];
    const proactiveMessage = localStorage.getItem(`smartschool_proactive_msg_${state.currentStudent.id}`);
    if (proactiveMessage) {
        newChatHistory.push({ role: 'model', parts: [{ text: proactiveMessage }] });
        localStorage.removeItem(`smartschool_proactive_msg_${state.currentStudent.id}`);
    }
    setState({ activeChat: null, chatHistory: newChatHistory });
    renderChatHistory(chatMessagesContainer, newChatHistory);
    chatInput.focus();

    return studyBuddyView;
};


const renderStudentDashboard = (mainContentContainer) => {
    const state = getState();
    const { currentStudent, announcements, examinations, completedExams, essayAssignments, essaySubmissions } = state;

    // Announcements
    const announcementElements = announcements.length > 0 
        ? announcements.map(a => el('div', { className: 'announcement-card' }, [
            el('p', { textContent: a.text }),
            el('div', { className: 'timestamp', textContent: a.date })
        ]))
        : [el('p', {}, ['No announcements yet.'])];

    // Exams
    const studentExams = examinations.filter(exam => exam.className === currentStudent.class);
    const examElements = studentExams.length > 0
        ? studentExams.map(exam => {
            const completed = completedExams.find(c => c.examId === exam.id && c.studentId === currentStudent.id);
            const actionElements = completed
                ? [
                    el('span', { className: 'score-display' }, [`Score: ${completed.scaledScore.toFixed(1)}%`]),
                    el('button', { className: 'btn btn-info', disabled: true }, ['Completed'])
                  ]
                : [el('button', { className: 'btn btn-info view-exam-btn' }, ['Take Exam'])];
            
            const examItem = el('div', { className: 'exam-item', 'data-id': exam.id }, [
                el('div', { className: 'exam-item-info' }, [
                    el('h5', {}, [`${exam.title} (${exam.subject})`]),
                    el('p', {}, [`Questions: ${exam.questions.length} | Duration: ${exam.duration} mins`])
                ]),
                el('div', { className: 'exam-item-actions' }, actionElements)
            ]);
            examItem.querySelector('.view-exam-btn')?.addEventListener('click', () => {
                renderViewExamModal(exam.id);
            });
            return examItem;
        })
        : [el('p', {}, ['No examinations assigned to your class yet.'])];
    
    // Essays
    const studentAssignments = essayAssignments.filter(a => a.className === currentStudent.class);
    const essayElements = studentAssignments.length > 0
        ? studentAssignments.map(assignment => {
            const submission = essaySubmissions.find(s => s.assignmentId === assignment.id && s.studentId === currentStudent.id);
            const statusElement = submission 
                ? el('span', { className: 'status graded' }, [`Submitted ${submission.score ? `(Score: ${submission.score})` : ''}`])
                : el('span', { className: 'status pending' }, ['Pending']);

            const essayItem = el('div', { className: 'essay-submission-item', 'data-assignment-id': assignment.id }, [
                el('div', {}, [
                    el('span', { className: 'student-name' }, [assignment.title]),
                    statusElement
                ]),
                 el('button', { className: 'btn btn-secondary', style: { width: 'auto', padding: '5px 10px', fontSize: '14px' } }, [
                    submission ? 'View' : 'Submit'
                ])
            ]);
            essayItem.addEventListener('click', () => {
                 document.body.appendChild(renderStudentViewEssayModal(assignment.id));
            });
            return essayItem;
        })
        : [el('p', {}, ['No essay assignments for your class yet.'])];
    
    // Report Card
    const reportCardContainer = el('div');
    renderReportCard(currentStudent.id, "Third Term", reportCardContainer); // Example term

    // Dashboard Grid
    const dashboard = el('div', { className: 'student-dashboard-grid' }, [
        el('div', { className: 'student-card clickable' }, [
             el('h4', {}, [el('span', { className: 'nav-icon' }, ['🤖']), ' Study Buddy']),
             el('p', {}, ['Your personal AI tutor. Ask questions, get explanations, and practice for your exams. Click to start a chat!'])
        ]),
        el('div', { className: 'student-card' }, [
             el('h4', {}, [el('span', { className: 'nav-icon' }, ['✍️']), ' Essay Assignments']),
             el('div', { className: 'scrollable-list' }, essayElements)
        ]),
        el('div', { className: 'student-card' }, [
             el('h4', {}, [el('span', { className: 'nav-icon' }, ['🎓']), ' My Report Card']),
             reportCardContainer
         ]),
         el('div', { className: 'student-card' }, [
             el('h4', {}, [el('span', { className: 'nav-icon' }, ['🏫']), ' Recent Announcements']),
             el('div', { className: 'scrollable-list' }, announcementElements)
         ]),
         el('div', { className: 'student-card' }, [
             el('h4', {}, [el('span', { className: 'nav-icon' }, ['📝']), ' Online Examinations']),
             el('div', { className: 'scrollable-list' }, examElements)
         ]),
    ]);

    dashboard.querySelector('.clickable').addEventListener('click', () => {
        mainContentContainer.innerHTML = '';
        mainContentContainer.appendChild(renderStudyBuddy(mainContentContainer));
    });

    return dashboard;
}

export const renderStudentPortal = () => {
    const { currentStudent } = getState();
    if (!currentStudent) return el('div', {}, ['Error: No student logged in.']);

    const handleLogout = () => api.logout();

    const studentHeader = el('header', { className: 'header' }, [
        el('div', { className: 'header-left' }, [
            el('div', { className: 'logo-section', style: { border: 'none', margin: 0, padding: 0 } }, [
                el('span', { className: 'logo-text' }, ['Smart School Portal'])
            ])
        ]),
        el('div', { className: 'header-right' }, [
            el('span', { className: 'header-welcome-text' }, [`Welcome, ${currentStudent.name.split(' ')[0]}`]),
            el('div', { className: 'user-avatar' }, [currentStudent.name.charAt(0).toUpperCase()]),
            el('button', { className: 'btn btn-icon-only', title: 'Logout' }, ['🚪'])
        ])
    ]);
    studentHeader.querySelector('button').addEventListener('click', handleLogout);
    
    const mainContentContainer = el('main', { className: 'student-portal-view' });
    mainContentContainer.appendChild(renderStudentDashboard(mainContentContainer));

    const studentPortal = el('div', { id: 'student-portal' }, [
        studentHeader,
        mainContentContainer
    ]);

    return studentPortal;
};