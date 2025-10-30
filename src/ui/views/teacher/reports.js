/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast, showSpinner, hideSpinner, simpleMarkdownToNodes } from "../../dom-utils.js";
import { getState } from "../../../state.js";
import { api } from "../../../api.js";
import { getLetterGrade } from "../../utils.js";
import { aiService } from "../../../services/ai.js";

const populateStudentSelector = (selectElement) => {
    const { students } = getState();
    const originalValue = selectElement.value;
    selectElement.innerHTML = '';
    selectElement.appendChild(el('option', { value: '', textContent: '-- Select a Student --' }));
    students
        .sort((a,b) => a.name.localeCompare(b.name))
        .forEach(student => {
            selectElement.appendChild(el('option', { value: student.id, textContent: `${student.name} (${student.id})`}));
        });
    if (originalValue) selectElement.value = originalValue;
};

const renderAiGradeModal = (studentId, subject) => {
    const { students, essayAssignments, essaySubmissions } = getState();
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Find the relevant assignment and submission based on subject name in title
    const assignment = essayAssignments.find(a =>
        a.className === student.class && a.title.toLowerCase().includes(subject.toLowerCase())
    );
    const submission = assignment ? essaySubmissions.find(s =>
        s.assignmentId === assignment.id && s.studentId === studentId && s.feedback // Must have AI feedback
    ) : null;

    const closeModal = (modal) => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    };

    let modalContent;
    if (submission) {
        modalContent = el('div', { className: 'modal-content', style: { maxWidth: '700px' } }, [
            el('button', { className: 'modal-close-btn' }, ['×']),
            el('h3', {}, ['AI Grade Details']),
            el('p', {}, [
                el('strong', {}, ['Student: ']), `${student.name} | `,
                el('strong', {}, ['Subject: ']), subject
            ]),
            el('hr'),
            el('h5', {}, ['Assignment Prompt']),
            el('p', { className: 'modal-prompt' }, [assignment.prompt]),
            el('h5', {}, ["Student's Submission"]),
            el('div', { className: 'modal-submission-text' }, [submission.submissionText]),
            el('hr'),
            el('h5', {}, ["AI Analysis"]),
            el('div', { className: 'ai-summary-box' }, simpleMarkdownToNodes(submission.feedback)),
            el('p', { className: 'modal-ai-score' }, [
                el('strong', {}, ['AI Suggested Score: ']),
                `${submission.score} / 100`
            ])
        ]);
    } else {
        modalContent = el('div', { className: 'modal-content' }, [
            el('button', { className: 'modal-close-btn' }, ['×']),
            el('h3', {}, ['AI Grade Details']),
            el('p', {}, ['No AI-graded essay was found for this student in this subject.'])
        ]);
    }

    const modal = el('div', { className: 'modal-overlay' }, [modalContent]);
    modal.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(modal));
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
};

export const renderReportCard = (studentId, term, container) => {
    const { students, grades, essayAssignments, essaySubmissions } = getState();
    const student = students.find(s => s.id === studentId);
    if (!student) {
        renderChildren(container, [el('p', {}, ['Student not found.'])]);
        return;
    }

    const gradesForTerm = grades.filter(g => g.studentId === studentId && g.term === term);

    if (gradesForTerm.length === 0) {
        renderChildren(container, [el('p', { className: 'placeholder-text', style: { textAlign: 'center' } }, [`No grades available for ${term}.`])]);
        return;
    }

    const totalPoints = gradesForTerm.reduce((acc, g) => acc + g.total, 0);
    const average = totalPoints / gradesForTerm.length;

    const tableRows = gradesForTerm.map(g => {
        const letterGrade = getLetterGrade(g.total);

        // Find if an AI-graded submission exists for this subject
        const assignment = essayAssignments.find(a =>
            a.className === student.class && a.title.toLowerCase().includes(g.subject.toLowerCase())
        );
        const submission = assignment ? essaySubmissions.find(s =>
            s.assignmentId === assignment.id && s.studentId === studentId && s.feedback
        ) : null;

        const viewAiGradeBtn = submission
            ? el('button', { className: 'btn btn-info', style: { padding: '4px 8px', fontSize: '12px' } }, ['View AI Grade'])
            : el('span', {}, ['-']);
        
        if (submission) {
            viewAiGradeBtn.addEventListener('click', () => renderAiGradeModal(studentId, g.subject));
        }
        
        return el('tr', {}, [
            el('td', {}, [g.subject]),
            el('td', {}, [g.ca1?.toString() || '-']),
            el('td', {}, [g.ca2?.toString() || '-']),
            el('td', {}, [g.ca3?.toString() || '-']),
            el('td', {}, [g.exam?.toString() || '-']),
            el('td', {}, [g.total.toFixed(1)]),
            el('td', {}, [el('span', { className: `letter-grade ${letterGrade.className}` }, [letterGrade.grade])]),
            el('td', {}, [g.remarks]),
            el('td', { style: { textAlign: 'center' } }, [viewAiGradeBtn]),
        ]);
    });
    
    const promotionStatus = average >= 50 ? { text: 'Promoted to Next Class', className: 'promotion-status-promoted' }
        : average >= 40 ? { text: 'Promoted on Trial', className: 'promotion-status-probation' }
        : { text: 'Advised to Repeat', className: 'promotion-status-repeat' };

    const handleGenerateRemarks = async (e) => {
        const button = e.target;
        button.disabled = true;
        showSpinner('#report-card-ai-remarks');
        const remarksBox = container.querySelector('#report-remarks-box');
        remarksBox.textContent = 'Generating AI-powered remarks...';

        const gradesSummary = gradesForTerm.map(g => `${g.subject}: ${g.total}%`).join(', ');
        const prompt = `You are a thoughtful and encouraging teacher writing end-of-term report card remarks for a student named ${student.name}. Their overall average for the term was ${average.toFixed(1)}%. Their subject scores were: ${gradesSummary}.
        Write a 3-4 sentence summary of their performance. Start by mentioning a strength or a high-performing subject. Then, gently point out one or two subjects where they could improve. Conclude with an encouraging closing statement.`;

        const remarksText = await aiService.generateSimpleText(prompt);

        if (remarksText) {
             renderChildren(remarksBox, simpleMarkdownToNodes(remarksText));
        } else {
            remarksBox.textContent = 'Failed to generate remarks.';
        }
        
        button.disabled = false;
        hideSpinner('#report-card-ai-remarks');
    };

    const remarksBtn = el('button', { className: 'btn btn-secondary', style: { width: 'auto' } }, ['Generate Remarks']);
    remarksBtn.addEventListener('click', handleGenerateRemarks);

    const reportCardElement = el('div', { className: 'report-card' }, [
        el('div', { className: 'report-card-header' }, [
            el('div', { className: 'header-logo' }, [
                el('img', { src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzJkNWEyNyI+PHBhdGggZD0iTTUgMTMuMTh2NEwxMiAyMWw3LTMuODF2LTRMMTIgMTdsLTctMy44MnpNMTIgM0wxIDlsMTEgNiA5LTQuOTFWMTdoMlY5TDEyIDMiLz48L3N2Zz4=" }),
                'Smart School'
            ]),
            el('div', { className: 'header-title' }, [
                el('h2', {}, ['End of Term Report']),
                el('p', {}, [term])
            ]),
             el('div', { className: 'header-student-info' }, [
                el('strong', {}, [student.name]),
                el('span', {}, [student.class])
            ]),
        ]),
        el('div', { className: 'report-card-summary' }, [
            el('h6', {}, ['Term Average']),
            el('span', { className: 'average-score' }, [`${average.toFixed(1)}%`])
        ]),
        el('table', { className: 'grades-table' }, [
            el('thead', {}, [
                el('tr', {}, [
                    el('th', {}, ['Subject']), el('th', {}, ['CA1']), el('th', {}, ['CA2']),
                    el('th', {}, ['CA3']), el('th', {}, ['Exam']), el('th', {}, ['Total']),
                    el('th', {}, ['Grade']), el('th', {}, ['Remarks']),
                    el('th', {}, ['AI Actions']),
                ])
            ]),
            el('tbody', {}, tableRows)
        ]),
        el('div', { id: 'report-card-ai-remarks', className: 'ai-remarks-section', style: { position: 'relative' } }, [
            el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
            el('h6', {}, ['AI-Powered Remarks']),
            el('div', { id: 'report-remarks-box', className: 'ai-summary-box' }, ['Click the button to generate personalized remarks for this student.']),
            remarksBtn
        ]),
        el('div', { className: `promotion-status ${promotionStatus.className}` }, [
            el('strong', {}, [promotionStatus.text])
        ])
    ]);
    renderChildren(container, [reportCardElement]);
};


export const renderReportsView = () => {
    const studentSelect = el('select');
    const termSelect = el('select', {}, [
        el('option', {}, ['First Term']),
        el('option', {}, ['Second Term']),
        el('option', {selected: true}, ['Third Term']),
    ]);
    const reportContainer = el('div', { id: 'report-card-container' }, [
        el('p', { className: 'placeholder-text' }, ['Select a student and term to view their report card.'])
    ]);

    populateStudentSelector(studentSelect);
    
    const updateReport = () => {
        const studentId = studentSelect.value;
        const term = termSelect.value;
        if (studentId && term) {
            renderReportCard(studentId, term, reportContainer);
        }
    };
    
    studentSelect.addEventListener('change', updateReport);
    termSelect.addEventListener('change', updateReport);

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['Student Results']),
            el('div', { className: 'form-row' }, [
                el('div', { className: 'form-group' }, [
                    el('label', {}, ['Select Student']),
                    studentSelect
                ]),
                el('div', { className: 'form-group' }, [
                    el('label', {}, ['Select Term']),
                    termSelect
                ]),
            ]),
            reportContainer
        ])
    ]);

    return view;
};