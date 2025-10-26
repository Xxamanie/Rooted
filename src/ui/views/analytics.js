/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, simpleMarkdownToNodes, showSpinner, hideSpinner } from "../dom-utils.js";
import { getState } from "../../state.js";
import { geminiService } from "../../services/gemini.js";

export const renderAnalyticsView = () => {
    const state = getState();
    const { students, staff, grades, attendanceRecords } = state;

    const handleGenerateAtRiskReport = async (e) => {
        const button = e.target;
        button.disabled = true;
        showSpinner('#at-risk-report-card');
        const reportBox = document.getElementById('analytics-at-risk-box');
        reportBox.textContent = 'Analyzing school data... This may take a moment.';

        const studentData = students.map(student => {
            const studentGrades = grades.filter(g => g.studentId === student.id);
            const avgScore = studentGrades.length ? studentGrades.reduce((acc, g) => acc + g.total, 0) / studentGrades.length : -1;
            
            const attendance = { Present: 0, Absent: 0, Late: 0 };
            attendanceRecords.forEach(ar => {
                const record = ar.records.find(r => r.studentId === student.id);
                if(record) attendance[record.status]++;
            });
            const totalDays = attendance.Present + attendance.Absent + attendance.Late;
            
            return {
                name: student.name,
                class: student.class,
                avgScore: avgScore.toFixed(1),
                attendance: totalDays > 0 ? `${((attendance.Absent + attendance.Late) / totalDays * 100).toFixed(0)}% problematic` : 'N/A'
            };
        });

        const prompt = `As a school principal, analyze this data to identify students at risk of failing or dropping out. An at-risk student has an average score below 50 or problematic attendance over 20%. For each at-risk student, provide their name, class, and a 1-sentence summary of the issue with a recommended action. If no students are at risk, state that clearly. Data: ${JSON.stringify(studentData)}`;

        const reportText = await geminiService.generateSimpleText(prompt);

        if (reportText) {
            renderChildren(reportBox, simpleMarkdownToNodes(reportText));
        } else {
            reportBox.textContent = 'Failed to generate the report.';
        }

        button.disabled = false;
        hideSpinner('#at-risk-report-card');
    };

    // 1. Key Metrics
    const totalStudents = students.length;
    const totalStaff = staff.filter(s => s.role !== 'Administrator').length;
    const totalClasses = [...new Set(students.map(s => s.class))].length;

    const totalAttendanceRecords = attendanceRecords.flatMap(ar => ar.records);
    const presentCount = totalAttendanceRecords.filter(r => r.status === 'Present').length;
    const attendanceRate = totalAttendanceRecords.length > 0 ? (presentCount / totalAttendanceRecords.length) * 100 : 0;
    
    const overallAverageScore = grades.length > 0
        ? grades.reduce((acc, g) => acc + g.total, 0) / grades.length
        : 0;
        
    const keyMetricsElements = [
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Total Students']), el('p', { className: 'stat' }, [totalStudents.toString()]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Total Teachers']), el('p', { className: 'stat' }, [totalStaff.toString()]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Total Classes']), el('p', { className: 'stat' }, [totalClasses.toString()]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Attendance Rate']), el('p', { className: 'stat' }, [`${attendanceRate.toFixed(1)}%`]) ]),
        el('div', { className: 'info-card' }, [ el('h5', {}, ['Avg. Score']), el('p', { className: 'stat' }, [`${overallAverageScore.toFixed(1)}%`]) ])
    ];

    // 2. Class Performance
    const classPerformance = [...new Set(students.map(s => s.class))].map(className => {
        const studentIdsInClass = students.filter(s => s.class === className).map(s => s.id);
        const gradesInClass = grades.filter(g => studentIdsInClass.includes(g.studentId));
        const avgScore = gradesInClass.length > 0
            ? gradesInClass.reduce((acc, g) => acc + g.total, 0) / gradesInClass.length
            : 0;
        return { className, avgScore };
    }).sort((a,b) => b.avgScore - a.avgScore);

    const classPerformanceElements = classPerformance.map(cp => 
        el('div', { className: 'bar-item' }, [
            el('div', { className: 'bar-label' }, [cp.className]),
            el('div', { className: 'bar-wrapper' }, [
                el('div', { className: 'bar', style: { width: `${cp.avgScore.toFixed(1)}%` }, title: `${cp.avgScore.toFixed(1)}%` })
            ]),
            el('div', { className: 'bar-value' }, [`${cp.avgScore.toFixed(1)}%`])
        ])
    );
    
    const atRiskReportBtn = el('button', { className: 'btn btn-secondary', style: { width: 'auto' } }, ['Generate Report']);
    atRiskReportBtn.addEventListener('click', handleGenerateAtRiskReport);

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'management-card' }, [
            el('h3', {}, ['School-Wide Analytics Dashboard']),
            el('p', { className: 'settings-description', style: { marginTop: '0' } }, ['An overview of key school metrics. Use this dashboard to identify trends and make data-driven decisions.'])
        ]),
        el('div', { style: { marginTop: '25px' } }, [
            el('div', { className: 'analytics-grid' }, keyMetricsElements)
        ]),
        el('div', { className: 'admin-grid-large', style: { marginTop: '25px' } }, [
            el('div', { className: 'analytics-card' }, [
                el('h4', {}, ['Class Performance (Overall Average)']),
                el('div', { className: 'bar-chart' }, classPerformanceElements)
            ]),
            el('div', { id: 'at-risk-report-card', className: 'analytics-card', style: { position: 'relative' } }, [
                el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
                el('h4', {}, ['AI-Powered: At-Risk Student Report']),
                el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '20px' } }, ['Use AI to analyze school-wide grade and attendance data to generate a concise report identifying students who may be falling behind, allowing for early and effective intervention.']),
                atRiskReportBtn,
                el('div', { id: 'analytics-at-risk-box', className: 'ai-summary-box', style: { marginTop: '20px', whiteSpace: 'pre-wrap' } }, ['Click "Generate Report" to get an AI analysis.'])
            ])
        ])
    ]);
    
    return view;
};