/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast, showSpinner, hideSpinner, createConfirmationModal } from "../../dom-utils.js";
import { getState } from "../../../state.js";
import { api } from "../../../api.js";
import { geminiService } from "../../../services/gemini.js";

let editingPlanId = null;

const renderPlanList = (container, formElements) => {
    const { lessonPlans } = getState();
    container.innerHTML = ''; // Clear previous content

    if (lessonPlans.length === 0) {
        container.appendChild(el('p', { className: 'placeholder-text' }, ['No lesson plans created yet.']));
        return;
    }

    const handleEdit = (plan) => {
        editingPlanId = plan.id;
        formElements.form.querySelector('h4').textContent = 'Edit Lesson Plan';
        formElements.submitBtn.textContent = 'Update Plan';
        formElements.subjectInput.value = plan.subject;
        formElements.classInput.value = plan.class;
        formElements.termSelect.value = plan.term;
        formElements.topicInput.value = plan.topic;
        formElements.detailsTextarea.value = plan.details;
    };

    const handleDelete = async (plan) => {
        const confirmed = await createConfirmationModal(`Are you sure you want to delete the lesson plan for "${plan.topic}"?`);
        if (confirmed) {
            await api.removeLessonPlan(plan.id);
            showToast('Lesson plan deleted.', 'success');
            renderPlanList(container, formElements);
        }
    };
    
    const sortedPlans = [...lessonPlans].sort((a, b) => (a.subject + a.topic).localeCompare(b.subject + b.topic));

    const planElements = sortedPlans.map(plan => {
        const editBtn = el('button', { className: 'btn-secondary-small' }, ['Edit']);
        editBtn.addEventListener('click', () => handleEdit(plan));
        const deleteBtn = el('button', { className: 'btn-danger' }, ['Delete']);
        deleteBtn.addEventListener('click', () => handleDelete(plan));

        return el('div', { className: 'scheme-item', 'data-id': plan.id }, [
            el('h5', {}, [`${plan.subject} - ${plan.class}`]),
            el('p', {}, [el('strong', {}, ['Topic: ']), plan.topic]),
            el('div', { className: 'record-meta', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                el('span', {}, [`Term: ${plan.term}`]),
                el('div', { className: 'action-cell' }, [editBtn, deleteBtn])
            ])
        ]);
    });
    
    renderChildren(container, planElements);
};

const formatAiPlanToText = (plan) => {
    let text = `Topic: ${plan.topic}\nGrade Level: ${plan.gradeLevel}\nDuration: ${plan.durationWeeks} weeks\n\n`;
    
    text += "LEARNING OBJECTIVES:\n";
    plan.learningObjectives.forEach(obj => text += `- ${obj}\n`);
    text += "\n";

    text += "WEEKLY BREAKDOWN:\n";
    plan.weeklyBreakdown.forEach(week => {
        text += `Week ${week.week}: ${week.topic}\n`;
        week.activities.forEach(act => text += `  - ${act}\n`);
    });
    text += "\n";

    text += "ASSESSMENT METHODS:\n";
    plan.assessmentMethods.forEach(method => text += `- ${method}\n`);

    return text;
};

export const renderLessonPlansView = () => {
    const planListContainer = el('div', { className: 'scrollable-list' });

    const clearForm = (form) => {
        editingPlanId = null;
        form.reset();
        form.querySelector('h4').textContent = 'Create New Lesson Plan';
        form.querySelector('button[type="submit"]').textContent = 'Save Plan';
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const planData = {
            subject: form.querySelector('#plan-subject').value,
            class: form.querySelector('#plan-class').value,
            term: form.querySelector('#plan-term').value,
            topic: form.querySelector('#plan-topic').value,
            details: form.querySelector('#plan-details').value,
        };

        if (!planData.subject || !planData.class || !planData.topic || !planData.details) {
            showToast('Please fill all required fields.', 'error');
            return;
        }

        if (editingPlanId) {
            await api.updateLessonPlan(editingPlanId, planData);
            showToast('Lesson plan updated successfully!', 'success');
        } else {
            await api.addLessonPlan(planData);
            showToast('Lesson plan saved successfully!', 'success');
        }
        
        clearForm(form);
        renderPlanList(planListContainer, formElements);
    };
    
    const handleGenerateWithAI = async (e) => {
        const button = e.target;
        const topic = document.getElementById('ai-plan-topic').value;
        const grade = document.getElementById('ai-plan-grade').value;
        const weeks = document.getElementById('ai-plan-weeks').value;
        if (!topic || !grade || !weeks) {
            showToast("Please fill in all AI generator fields.", "error");
            return;
        }

        button.disabled = true;
        showSpinner('#lesson-plan-form-card');
        
        const plan = await geminiService.generateLessonPlan(topic, grade, weeks);

        if (plan) {
            // Populate the main form with the generated content
            formElements.subjectInput.value = plan.topic; // Or can be derived
            formElements.classInput.value = plan.gradeLevel;
            formElements.topicInput.value = plan.topic;
            formElements.detailsTextarea.value = formatAiPlanToText(plan);
            showToast('AI draft populated. Review and save.', 'success');
        }
        
        button.disabled = false;
        hideSpinner('#lesson-plan-form-card');
    };

    const subjectInput = el('input', { type: 'text', id: 'plan-subject', required: true });
    const classInput = el('input', { type: 'text', id: 'plan-class', required: true, placeholder: 'e.g., Grade 10A' });
    const termSelect = el('select', { id: 'plan-term' }, [
        el('option', {}, ['First Term']),
        el('option', {}, ['Second Term']),
        el('option', { selected: true }, ['Third Term']),
    ]);
    const topicInput = el('input', { type: 'text', id: 'plan-topic', required: true });
    const detailsTextarea = el('textarea', { id: 'plan-details', rows: 15, required: true });
    const submitBtn = el('button', { type: 'submit', className: 'btn' }, ['Save Plan']);
    const clearBtn = el('button', { type: 'button', className: 'btn btn-secondary', style: { width: 'auto' } }, ['Clear']);
    
    const form = el('form', { id: 'lesson-plan-form' }, [
        el('h4', {}, ['Create New Lesson Plan']),
        el('div', { className: 'form-group' }, [el('label', {htmlFor: 'plan-subject'}, ['Subject']), subjectInput]),
        el('div', { className: 'form-row' }, [
            el('div', { className: 'form-group' }, [el('label', {htmlFor: 'plan-class'}, ['Class']), classInput]),
            el('div', { className: 'form-group' }, [el('label', {htmlFor: 'plan-term'}, ['Term']), termSelect]),
        ]),
        el('div', { className: 'form-group' }, [el('label', {htmlFor: 'plan-topic'}, ['Topic']), topicInput]),
        el('div', { className: 'form-group' }, [el('label', {htmlFor: 'plan-details'}, ['Lesson Plan Details']), detailsTextarea]),
        el('div', { style: { display: 'flex', gap: '10px' } }, [submitBtn, clearBtn]),
    ]);

    form.addEventListener('submit', handleFormSubmit);
    clearBtn.addEventListener('click', () => clearForm(form));
    
    const formElements = { form, subjectInput, classInput, termSelect, topicInput, detailsTextarea, submitBtn };
    
    const aiGeneratorCard = el('div', { className: 'record-form-card', style: { marginTop: '25px', background: 'var(--background-light)' } }, [
        el('h4', {}, ['AI Lesson Plan Generator']),
        el('p', { className: 'settings-description', style: { marginTop: '0', marginBottom: '15px' } }, ['Generate a draft lesson plan using AI. The result will populate the form above for you to edit and save.']),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'ai-plan-topic' }, ['Topic']),
            el('input', { type: 'text', id: 'ai-plan-topic', placeholder: 'e.g., Photosynthesis' })
        ]),
        el('div', { className: 'form-row' }, [
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ai-plan-grade' }, ['Grade Level']),
                el('input', { type: 'text', id: 'ai-plan-grade', placeholder: 'e.g., Grade 9' })
            ]),
            el('div', { className: 'form-group' }, [
                el('label', { htmlFor: 'ai-plan-weeks' }, ['Duration (Weeks)']),
                el('input', { type: 'number', id: 'ai-plan-weeks', value: '2', min: '1' })
            ])
        ]),
        el('button', { id: 'generate-ai-plan-btn', className: 'btn' }, ['Generate with AI'])
    ]);
    aiGeneratorCard.querySelector('#generate-ai-plan-btn').addEventListener('click', handleGenerateWithAI);
    
    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'scheme-grid' }, [
            el('div', { id: 'lesson-plan-form-card', className: 'management-card', style: { position: 'relative' } }, [
                el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
                form,
                aiGeneratorCard
            ]),
            el('div', { className: 'management-card' }, [
                el('h4', {}, ['Saved Lesson Plans']),
                planListContainer
            ])
        ])
    ]);

    renderPlanList(planListContainer, formElements);
    
    return view;
};