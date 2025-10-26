/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, simpleMarkdownToNodes, showSpinner, hideSpinner } from "../../dom-utils.js";
import { getState } from "../../../state.js";
import { geminiService } from "../../../services/gemini.js";
import { getLetterGrade } from "../../../utils.js";

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

const renderProgressReport = (studentId, container) => {
    const { students, grades, attendanceRecords, completedExams } = getState();
    const student = students.find(s => s.id === studentId);
    if (!student) {
        renderChildren(container, [el('p', {className: 'placeholder-text'}, ['Student not found.'])]);
        return;
    }

    // Attendance Summary
    const attendance = { Present: 0, Absent: 0, Late: 0 };
    attendanceRecords.forEach(ar => {
        const record = ar.records.find(r => r.studentId === student.id);
        if(record) attendance[record.status]++;
    });
    const totalDays = attendance.Present + attendance.Absent + attendance.Late;

    // Grades Summary
    const studentGrades = grades.filter(g => g.studentId === studentId);
    const averageScore = studentGrades.length > 0
        ? studentGrades.reduce((acc, g) => acc + g.total, 0) / studentGrades.length
        : 0;
    
    // Exam Summary
    const studentCompletedExams = completedExams.filter(c => c.studentId === studentId);
    const averageExamScore = studentCompletedExams.length > 0
        ? studentCompletedExams.reduce((acc, e) => acc + e.scaledScore, 0) / studentCompletedExams.length
        : 0;

    const handleGenerateSummary = async (e) => {
        const button = e.target;
        button.disabled = true;
        showSpinner('#ai-summary-card');
        const summaryBox = container.querySelector('#progress-summary-box');
        summaryBox.textContent = 'Analyzing student data...';

        const data = {
            name: student.name,
            class: student.class,
            averageScore: `${averageScore.toFixed(1)}%`,
            averageExamScore: `${averageExamScore.toFixed(1)}%`,
            attendance: `${totalDays} days recorded (${attendance.Absent} absent, ${attendance.Late} late)`,
            gradesBySubject: studentGrades.map(g => `${g.subject}: ${g.total}% (${g.term})`).join(', ')
        };

        const prompt = `You are a school counselor. Analyze this student's data and write a concise progress report summary (3-4 sentences). Highlight strengths, identify areas for improvement, and suggest one actionable step for the student. Data: ${JSON.stringify(data)}`;

        const summaryText = await geminiService.generateSimpleText(prompt);
        if (summaryText) {
            renderChildren(summaryBox, simpleMarkdownToNodes(summaryText));
        } else {
            summaryBox.textContent = 'Failed to generate summary.';
        }

        button.disabled = false;
        hideSpinner('#ai-summary-card');
    };

    const summaryBtn = el('button', { className: 'btn btn-secondary', style: {width: 'auto', marginLeft: '10px'} }, ['Generate Summary']);
    summaryBtn.addEventListener('click', handleGenerateSummary);
    
    const reportCard = el('div', { className: 'progress-report-card' }, [
        el('div', { className: 'progress-report-header' }, [
            el('h5', {}, [student.name]),
            el('p', {}, [`${student.class} | ${student.id}`])
        ]),
        el('div', { className: 'progress-grid' }, [
            el('div', { className: 'progress-section' }, [
                el('h6', {}, ['Academic Performance']),
                el('p', {}, ['Overall Average: ', el('strong', {}, [`${averageScore.toFixed(1)}%`])]),
                el('p', {}, ['Average Exam Score: ', el('strong', {}, [`${averageExamScore.toFixed(1)}%`])]),
            ]),
            el('div', { className: 'progress-section' }, [
                el('h6', {}, ['Attendance Summary']),
                el('p', {}, ['Present: ', el('strong', {}, [attendance.Present.toString()])]),
                el('p', {}, ['Late: ', el('strong', {}, [attendance.Late.toString()])]),
                el('p', {}, ['Absent: ', el('strong', {}, [attendance.Absent.toString()])]),
            ])
        ]),
        el('div', { id: 'ai-summary-card', className: 'progress-section ai-summary-section', style: {position: 'relative'} }, [
             el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
             el('h6', {}, ['AI-Powered Progress Summary', summaryBtn]),
             el('div', { id: 'progress-summary-box', className: 'ai-summary-box' }, ['Click "Generate Summary" for an AI analysis of this student\'s progress.'])
        ])
    ]);

    renderChildren(container, [reportCard]);
};


export const renderProgressView = () => {
    const studentSelect = el('select');
    const reportContainer = el('div', { id: 'progress-report-container' }, [
        el('p', { className: 'placeholder-text' }, ['Select a student to view their progress report.'])
    ]);

    populateStudentSelector(studentSelect);
    studentSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            renderProgressReport(e.target.value, reportContainer);
        } else {
            renderChildren(reportContainer, [el('p', { className: 'placeholder-text' }, ['Select a student to view their progress report.'])]);
        }
    });

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['Student Progress Tracker']),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'progress-student-select' }, ['Select Student']),
                studentSelect
            ]),
            reportContainer
        ])
    ]);

    return view;
};