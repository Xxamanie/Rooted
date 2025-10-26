/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren, showToast, showSpinner, hideSpinner } from "../../dom-utils.js";
import { getState, setState } from "../../../state.js";
import { api } from "../../../api.js";
import { geminiService } from "../../../services/gemini.js";

let cameraModalStream = null;

// Module-level variables for exam state
let activeExamTimer = null;
let activeExamProctoringListeners = null;
let activeExamProgressSaver = null;
let studentWebcamStream = null;
let examModal = null;


const renderQuestionBank = (container) => {
    const { questionBank } = getState();
    
    const handleRemoveQuestion = (id) => {
        api.removeQuestionFromBank(id).then(() => {
            renderQuestionBank(container);
            showToast('Question removed.', 'success');
        });
    };

    if (questionBank.length === 0) {
        renderChildren(container, [ el('p', { className: 'placeholder-text' }, ['No questions in the bank yet. Add one above!']) ]);
        return;
    }

    const questionElements = questionBank.map(q => {
        let contentChildren = [];
        switch(q.type) {
            case 'mcq':
                contentChildren = [
                    el('p', {}, [el('strong', {}, ['Question: ']), q.content]),
                    el('ul', {}, q.options?.map(o => el('li', { style: { fontWeight: o === q.answer ? 'bold' : 'normal', color: o === q.answer ? '#2d5a27' : 'inherit' } }, [o])) || [])
                ];
                break;
            case 'text':
                 contentChildren = [el('p', {}, [el('strong', {}, ['Question: ']), q.content])];
                 break;
            case 'image':
                contentChildren = [
                    el('p', {}, [`Image Question: ${q.fileName || 'Captured Image'}`]),
                    el('img', { src: q.content, alt: 'Question Image', style: { maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '5px' } })
                ];
                break;
            case 'pdf':
                contentChildren = [
                    el('p', {}, [
                        'PDF Question: ',
                        el('a', { href: q.content, target: '_blank' }, [q.fileName || 'View PDF'])
                    ])
                ];
                break;
        }
        
        const deleteBtn = el('button', { className: 'btn btn-danger' }, ['Delete']);
        deleteBtn.addEventListener('click', () => handleRemoveQuestion(q.id));

        return el('div', { className: 'question-bank-item' }, [
            el('div', { className: 'question-content' }, [
                el('span', { className: 'badge' }, [q.type.toUpperCase()]),
                ...contentChildren
            ]),
            el('div', { className: 'question-actions' }, [deleteBtn])
        ]);
    });
    
    renderChildren(container, questionElements);
};

const hideCameraModal = (modal) => {
    if (cameraModalStream) {
        cameraModalStream.getTracks().forEach(track => track.stop());
        cameraModalStream = null;
    }
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
};

const createCameraModal = () => {
    const cameraFeed = el('video', { id: 'camera-feed', autoplay: true, playsinline: true, muted: true });
    const modal = el('div', { id: 'camera-modal', className: 'modal-overlay' });

    const handleCaptureImage = async () => {
        if (!cameraFeed.srcObject) return;
        const canvas = document.createElement('canvas');
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        
        await api.addQuestionToBank({ type: 'image', content: imageDataUrl, fileName: `capture-${Date.now()}.jpg` });
        showToast('Image captured and added to bank!', 'success');
        document.dispatchEvent(new CustomEvent('render-view'));
        hideCameraModal(modal);
    };

    const modalContent = el('div', { className: 'modal-content' }, [
        el('button', { className: 'modal-close-btn' }, ['×']),
        el('h3', {}, ['Capture Question from Camera']),
        cameraFeed,
        el('button', { className: 'btn' }, ['Capture Image'])
    ]);

    modalContent.querySelector('.modal-close-btn').addEventListener('click', () => hideCameraModal(modal));
    modalContent.querySelector('.btn').addEventListener('click', handleCaptureImage);
    modal.appendChild(modalContent);

    // Open logic
    setTimeout(() => modal.classList.add('visible'), 10);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            cameraModalStream = stream;
            cameraFeed.srcObject = stream;
        })
        .catch(err => {
            console.error('Camera error:', err);
            showToast('Could not access camera.', 'error');
            hideCameraModal(modal);
        });

    return modal;
};


export const renderAssessmentView = () => {

    const questionBankList = el('div', { className: 'scrollable-list' });

    const handleGenerateQuiz = async (e) => {
        const button = e.target;
        const topic = document.getElementById('quiz-topic').value;
        const numQuestions = document.getElementById('num-questions').value;
        if (!topic) {
            showToast("Please enter a topic for the quiz.", "error");
            return;
        }
        
        button.disabled = true;
        showSpinner('#quiz-card');
        const quizResultsContainer = document.getElementById('quiz-results-container');
        quizResultsContainer.innerHTML = '';
        
        const quizData = await geminiService.generateQuiz(topic, numQuestions);
        
        if (quizData) {
            const quizElements = quizData.map((q, index) => {
                const optionElements = q.options.map((option) => 
                    el('li', { style: { backgroundColor: option === q.answer ? '#d4edda' : 'inherit', borderLeft: option === q.answer ? '3px solid #155724' : 'inherit' } }, [option])
                );

                return el('div', { className: 'quiz-question' }, [
                    el('p', {}, [el('strong', {}, [`${index + 1}. ${q.question}`])]),
                    el('ul', { className: 'quiz-options' }, optionElements),
                    el('p', { className: 'quiz-answer' }, [`Correct Answer: ${q.answer}`])
                ]);
            });
            renderChildren(quizResultsContainer, [
                el('h3', { style: { color: '#2d5a27', marginBottom: '15px' } }, ['Generated Quiz']),
                ...quizElements
            ]);
        } else {
             renderChildren(quizResultsContainer, [el('p', { style: { color: 'red', textAlign: 'center' } }, ['Sorry, something went wrong. Please try again.'])]);
        }
        
        button.disabled = false;
        hideSpinner('#quiz-card');
    };
    
    const handleGenerateLessonPlan = async (e) => {
        const button = e.target;
        const topic = document.getElementById('plan-topic').value;
        const grade = document.getElementById('plan-grade').value;
        const weeks = document.getElementById('plan-weeks').value;
        if (!topic || !grade || !weeks) {
            showToast("Please fill in all fields for the lesson plan.", "error");
            return;
        }

        button.disabled = true;
        showSpinner('#plan-card');
        const resultsContainer = document.getElementById('plan-results-container');
        const diffContainer = document.getElementById('differentiated-materials-container');
        resultsContainer.innerHTML = '';
        diffContainer.innerHTML = '';

        const plan = await geminiService.generateLessonPlan(topic, grade, weeks);

        if (plan) {
            const objectivesElements = plan.learningObjectives.map((obj) => el('li', {}, [obj]));
            const breakdownElements = plan.weeklyBreakdown.map((week) => el('div', {}, [
                el('h5', {}, [`Week ${week.week}: ${week.topic}`]),
                el('ul', {}, week.activities.map((act) => el('li', {}, [act])))
            ]));
            const assessmentsElements = plan.assessmentMethods.map((method) => el('li', {}, [method]));
            
            const diffBtn = el('button', { className: 'btn btn-secondary', style: { width: 'auto', marginTop: '15px' } }, ['Generate Differentiated Materials']);
            diffBtn.addEventListener('click', () => handleGenerateDifferentiatedMaterials(topic, diffBtn));

            const planElements = [
                el('h4', { 'data-topic': plan.topic }, [`Lesson Plan: ${plan.topic} for ${plan.gradeLevel}`]),
                el('h5', {}, ['Learning Objectives']),
                el('ul', {}, objectivesElements),
                ...breakdownElements,
                el('h5', {}, ['Assessment Methods']),
                el('ul', {}, assessmentsElements),
                diffBtn
            ];
            renderChildren(resultsContainer, planElements);
        } else {
            renderChildren(resultsContainer, [el('p', { style: { color: 'red' } }, ['Failed to generate lesson plan. Please try again.'])]);
        }
        
        button.disabled = false;
        hideSpinner('#plan-card');
    };

    const handleGenerateDifferentiatedMaterials = async (topic, button) => {
        button.disabled = true;
        showSpinner('#plan-card');
        const resultsContainer = document.getElementById('differentiated-materials-container');
        resultsContainer.innerHTML = '';

        const materials = await geminiService.generateDifferentiatedMaterials(topic);

        if (materials) {
            const materialElements = materials.map((item) => 
                el('div', { className: 'differentiated-item' }, [
                    el('h6', {}, [item.level]),
                    el('p', {}, [item.focus]),
                    el('ul', {}, item.activities.map((act) => el('li', {}, [act])))
                ])
            );
            renderChildren(resultsContainer, [
                el('h5', {}, ['Differentiated Materials']),
                el('div', { className: 'differentiated-grid' }, materialElements)
            ]);
        } else {
             renderChildren(resultsContainer, [el('p', { style: { color: 'red' } }, ['Failed to generate materials. Please try again.'])]);
        }
        
        button.disabled = false;
        hideSpinner('#plan-card');
    };
    
    const handleAddManualQuestion = async (e) => {
        e.preventDefault();
        const form = e.target;
        const type = form.querySelector('#question-type-select').value;
        const text = form.querySelector('#question-text-input').value;
        if (!text) {
            showToast('Question text cannot be empty.', 'error');
            return;
        }

        let questionData;
        if (type === 'mcq') {
            const options = Array.from(form.querySelectorAll('.mcq-option')).map(i => i.value);
            const radio = form.querySelector('input[name="correct-answer-radio"]:checked');
            if (!radio) {
                 showToast('Please select a correct answer for the MCQ.', 'error');
                 return;
            }
            const correctIndex = radio.value;
            const answer = options[parseInt(correctIndex, 10)];
            if (options.some(o => !o.trim()) || !answer) {
                showToast('All MCQ options must be filled out and a correct answer selected.', 'error');
                return;
            }
            questionData = { type: 'mcq', content: text, options, answer };
        } else {
            questionData = { type: 'text', content: text };
        }

        await api.addQuestionToBank(questionData);
        showToast('Question added to bank!', 'success');
        renderQuestionBank(questionBankList);
        form.reset();
        form.querySelector('#question-type-select').dispatchEvent(new Event('change'));
    };

    const handleQuestionFileUpload = (e) => {
        const input = e.target;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result;
            if (!result) return;
            
            let questionData = null;
            if (file.type.startsWith('image/')) {
                questionData = { type: 'image', content: result, fileName: file.name };
            } else if (file.type === 'application/pdf') {
                questionData = { type: 'pdf', content: result, fileName: file.name };
            } else if (file.type === 'text/plain') {
                questionData = { type: 'text', content: result };
            }

            if (questionData) {
                await api.addQuestionToBank(questionData);
                showToast('Question from file added!', 'success');
                renderQuestionBank(questionBankList);
            } else {
                showToast('Unsupported file type.', 'error');
            }
        };

        reader.readAsDataURL(file);
        input.value = ''; // Reset input
    };
    
    const mcqContainer = el('div', {}, [
        el('label', { style: { marginBottom: '10px', display: 'block' } }, ['Options & Correct Answer']),
        el('div', { className: 'form-group mcq-option-input' }, [
            el('input', { type: 'radio', name: 'correct-answer-radio', value: '0', checked: true }),
            el('input', { type: 'text', className: 'mcq-option', placeholder: 'Option 1' })
        ]),
        el('div', { className: 'form-group mcq-option-input' }, [
            el('input', { type: 'radio', name: 'correct-answer-radio', value: '1' }),
            el('input', { type: 'text', className: 'mcq-option', placeholder: 'Option 2' })
        ]),
        el('div', { className: 'form-group mcq-option-input' }, [
            el('input', { type: 'radio', name: 'correct-answer-radio', value: '2' }),
            el('input', { type: 'text', className: 'mcq-option', placeholder: 'Option 3' })
        ]),
        el('div', { className: 'form-group mcq-option-input' }, [
            el('input', { type: 'radio', name: 'correct-answer-radio', value: '3' }),
            el('input', { type: 'text', className: 'mcq-option', placeholder: 'Option 4' })
        ])
    ]);
    
    const questionTypeSelect = el('select', { id: 'question-type-select' }, [
        el('option', { value: 'mcq' }, ['Multiple Choice']),
        el('option', { value: 'text' }, ['Text / Essay'])
    ]);
    questionTypeSelect.addEventListener('change', (e) => {
        mcqContainer.style.display = e.target.value === 'mcq' ? 'block' : 'none';
    });

    const manualQuestionForm = el('form', {}, [
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'question-type-select' }, ['Question Type']),
            questionTypeSelect
        ]),
        el('div', { className: 'form-group' }, [
            el('label', { htmlFor: 'question-text-input' }, ['Question']),
            el('textarea', { id: 'question-text-input', rows: 3, placeholder: 'Enter the question text here...' })
        ]),
        mcqContainer,
        el('button', { type: 'submit', className: 'btn' }, ['Add to Bank'])
    ]);
    manualQuestionForm.addEventListener('submit', handleAddManualQuestion);
    
    const fileUploadInput = el('input', { type: 'file', id: 'question-file-upload', className: 'form-group', accept: '.txt,.pdf,.png,.jpg,.jpeg' });
    fileUploadInput.addEventListener('change', handleQuestionFileUpload);
    
    const openCameraBtn = el('button', { className: 'btn btn-secondary', style: { width: '100%' } }, [
        el('span', { className: 'nav-icon', style: { fontSize: '16px' } }, ['📸']), ' Take a Picture'
    ]);
    openCameraBtn.addEventListener('click', () => document.body.appendChild(createCameraModal()));

    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'assessment-layout' }, [
             el('div', { className: 'assessment-card' }, [
                el('h3', {}, ['Question Bank & Manual Entry']),
                el('div', { className: 'question-entry-grid' }, [
                    el('div', { className: 'question-entry-form' }, [manualQuestionForm]),
                    el('div', { className: 'question-entry-uploads' }, [
                        el('h4', { style: { fontSize: '1.1em', border: 'none', padding: 0, marginBottom: '15px' } }, ['Or Upload Question']),
                        el('div', { className: 'form-group' }, [
                            el('label', { htmlFor: 'question-file-upload' }, ['Upload Text, PDF, or Image']),
                            fileUploadInput
                        ]),
                        openCameraBtn
                    ])
                ]),
                el('hr', { style: { margin: '30px 0', borderColor: 'var(--border-color)' } }),
                el('h4', {}, ['Current Question Bank']),
                questionBankList
            ]),
            el('div', { className: 'assessment-ai-grid' }, [
                el('div', { id: 'quiz-card', className: 'assessment-card', style: { position: 'relative' } }, [
                    el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
                    el('h3', {}, ['AI Quiz Generator']),
                    el('div', { className: 'form-group' }, [
                        el('label', { htmlFor: 'quiz-topic' }, ['Quiz Topic']),
                        el('input', { type: 'text', id: 'quiz-topic', placeholder: 'e.g., The Solar System' })
                    ]),
                    el('div', { className: 'form-group' }, [
                        el('label', { htmlFor: 'num-questions' }, ['Number of Questions']),
                        el('select', { id: 'num-questions' }, [
                            el('option', {}, ['3']),
                            el('option', { selected: true }, ['5']),
                            el('option', {}, ['10'])
                        ])
                    ]),
                    el('button', { className: 'btn' }, ['Generate Quiz'])
                ]),
                el('div', { id: 'plan-card', className: 'assessment-card', style: { position: 'relative' } }, [
                     el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
                     el('h3', {}, ['AI Lesson Plan Generator']),
                     el('div', { className: 'form-group' }, [
                        el('label', { htmlFor: 'plan-topic' }, ['Topic']),
                        el('input', { type: 'text', id: 'plan-topic', placeholder: 'e.g., Photosynthesis' })
                    ]),
                    el('div', { className: 'form-row' }, [
                        el('div', { className: 'form-group' }, [
                            el('label', { htmlFor: 'plan-grade' }, ['Grade Level']),
                            el('input', { type: 'text', id: 'plan-grade', placeholder: 'e.g., Grade 9' })
                        ]),
                        el('div', { className: 'form-group' }, [
                            el('label', { htmlFor: 'plan-weeks' }, ['Duration (Weeks)']),
                            el('input', { type: 'number', id: 'plan-weeks', value: '2' })
                        ])
                    ]),
                     el('button', { className: 'btn' }, ['Generate Plan'])
                ])
            ])
        ])
    ]);
    
    view.querySelector('#quiz-card .btn').addEventListener('click', handleGenerateQuiz);
    view.querySelector('#plan-card .btn').addEventListener('click', handleGenerateLessonPlan);
    
    view.addEventListener('render-view', () => renderQuestionBank(questionBankList));
    document.addEventListener('render-view', () => {
        // A bit of a hack to re-render when a dependent view changes data
        if (document.contains(view)) {
            renderQuestionBank(questionBankList);
        }
    });

    renderQuestionBank(questionBankList);
    
    return view;
};


// =================================================================
// --- EXAMINATION LOGIC
// =================================================================

const startStudentWebcam = async () => {
    const videoEl = examModal.querySelector('#student-webcam-feed');
    const placeholder = examModal.querySelector('#student-webcam-placeholder');
    if (!videoEl || !placeholder) return;
    try {
        studentWebcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoEl.srcObject = studentWebcamStream;
        videoEl.style.display = 'block';
        placeholder.style.display = 'none';
    } catch (err) {
        console.error("Webcam access denied:", err);
        showToast("Webcam access is required for proctoring.", "error");
        hideViewExamModal();
    }
};

const stopStudentWebcam = () => {
    if (studentWebcamStream) {
        studentWebcamStream.getTracks().forEach(track => track.stop());
        studentWebcamStream = null;
    }
    if (examModal) {
        const videoEl = examModal.querySelector('#student-webcam-feed');
        const placeholder = examModal.querySelector('#student-webcam-placeholder');
        if (videoEl) videoEl.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }
};

const startProctoringListeners = (studentId, examId) => {
    const onVisibilityChange = () => {
        if (document.hidden) {
            api.addProctoringFlag(studentId, examId, 'Tab switched or window minimized.');
        }
    };
    const onBlur = () => {
        api.addProctoringFlag(studentId, examId, 'Window lost focus.');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    activeExamProctoringListeners = () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        activeExamProctoringListeners = null;
    };
};

const submitAndGradeExam = async (examId) => {
    if (activeExamTimer) {
        clearInterval(activeExamTimer);
        activeExamTimer = null;
    }
    if (activeExamProgressSaver) {
        clearInterval(activeExamProgressSaver);
        activeExamProgressSaver = null;
    }
    if (activeExamProctoringListeners) {
        activeExamProctoringListeners();
    }
    
    const { examinations, currentStudent } = getState();
    const exam = examinations.find(e => e.id === examId);
    const student = currentStudent;
    const form = examModal?.querySelector('#student-exam-form');
    
    if (!exam || !student || !form) {
        stopStudentWebcam();
        hideViewExamModal();
        return;
    };

    let mcqScore = 0;
    let maxMcqScore = 0;
    const textQuestionsToGrade = [];

    exam.questions.forEach((q, index) => {
        if (q.type === 'mcq') {
            maxMcqScore++;
            const checkedRadio = form.querySelector(`input[name="question-${index}"]:checked`);
            if (checkedRadio && checkedRadio.value === q.answer) {
                mcqScore++;
            }
        } else {
            const answerInput = form.querySelector(`[name="question-${index}"]`);
            textQuestionsToGrade.push({
                questionIndex: index,
                question: q.question,
                modelAnswer: q.answer,
                studentAnswer: answerInput.value,
                type: q.type
            });
        }
    });

    let textScore = 0;
    let maxTextScore = 0;

    if (textQuestionsToGrade.length > 0) {
        showToast('AI is grading your written answers...', 'info');
        const gradedScores = await geminiService.gradeExamAnswers(textQuestionsToGrade);
        
        if (gradedScores) {
            gradedScores.forEach(graded => {
                textScore += graded.score;
            });
        }
        // Calculate max possible score for text questions
        textQuestionsToGrade.forEach(q => {
            maxTextScore += (q.type === 'short_answer' ? 1 : 5); // 1 for short, 5 for para
        });
    }

    const totalScore = mcqScore + textScore;
    const maxScore = maxMcqScore + maxTextScore;
    const finalPercentage = (maxScore > 0) ? (totalScore / maxScore) * 100 : 0;

    // Proactively generate a study buddy message if the score is low (e.g. < 60%)
    if (finalPercentage < 60) {
        geminiService.generateProactiveMessage(
            student.name,
            exam.subject,
            totalScore,
            maxScore
        ).then(message => {
            if (message) {
                const proactiveMessageKey = `smartschool_proactive_msg_${student.id}`;
                localStorage.setItem(proactiveMessageKey, message);
            }
        });
    }

    await api.addCompletedExam({ studentId: student.id, examId: exam.id, score: totalScore, scaledScore: finalPercentage});
    
    // Save to main grade book ("assessment sheet")
    await api.updateGrade({
        studentId: student.id,
        term: exam.term,
        subject: exam.subject,
        exam: finalPercentage,
    });

    const progressKey = `smartschool_examprogress_${student.id}_${exam.id}`;
    localStorage.removeItem(progressKey);

    hideViewExamModal();
    showToast(`Exam submitted! Your score: ${finalPercentage.toFixed(1)}%`, 'success');
    document.dispatchEvent(new CustomEvent('state-change', { detail: { rerender: true }}));
};

const startExamTimer = (durationMinutes, examId) => {
    const timerEl = examModal?.querySelector('#exam-timer');
    if (!timerEl) return;

    if (activeExamTimer) {
        clearInterval(activeExamTimer);
    }

    let totalSeconds = durationMinutes * 60;
    
    const updateTimer = () => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (totalSeconds <= 60 && !timerEl.classList.contains('ending')) {
            timerEl.classList.add('ending');
        }

        if (totalSeconds <= 0) {
            submitAndGradeExam(examId);
            showToast('Time is up! Your exam has been submitted automatically.', 'info');
        } else {
            totalSeconds--;
        }
    };

    updateTimer();
    activeExamTimer = window.setInterval(updateTimer, 1000);
};

export const hideViewExamModal = () => {
    if (!examModal) return;

    if (activeExamTimer) {
        if (confirm('Are you sure you want to close the exam? This will submit your answers as they are.')) {
            const form = examModal.querySelector('#student-exam-form');
            if(form) submitAndGradeExam(form.dataset.examId);
        } else {
            return;
        }
    }
    
    stopStudentWebcam();
    const proctorView = document.getElementById('student-proctor-view');
    if(proctorView) proctorView.remove();

    examModal.classList.remove('visible');
    setTimeout(() => examModal.remove(), 300);
    examModal = null;
};

const showProctoringModal = (examId) => {
    const state = getState();
    const exam = state.examinations.find(ex => ex.id === examId);
    if (!exam) return;

    const studentsInClass = state.students.filter(s => s.class === exam.className);
    const studentsTakingExam = state.completedExams.filter(c => c.examId === examId);

    const studentRows = studentsInClass.map(student => {
        const examRecord = studentsTakingExam.find(s => s.studentId === student.id);
        let status, flags;
        if (examRecord) {
            status = el('span', { className: 'status submitted' }, ['In Progress']);
            flags = examRecord.proctoringFlags.length > 0
                ? el('ul', {}, examRecord.proctoringFlags.map(f => el('li', {}, [`${f.timestamp}: ${f.event}`])))
                : el('span', {}, ['No flags']);
        } else {
            status = el('span', { className: 'status pending' }, ['Not Started']);
            flags = el('span', {}, ['-']);
        }
        return el('tr', {}, [
            el('td', {}, [student.name]),
            el('td', {}, [status]),
            el('td', {}, [flags])
        ]);
    });

    const modalContent = el('div', { className: 'modal-content', style: { maxWidth: '700px' } }, [
        el('button', { className: 'modal-close-btn' }, ['×']),
        el('h3', {}, [`Monitoring: ${exam.title}`]),
        el('table', { className: 'proctoring-table' }, [
            el('thead', {}, [el('tr', {}, [el('th', {}, ['Student']), el('th', {}, ['Status']), el('th', {}, ['Proctoring Flags'])])]),
            el('tbody', {}, studentRows)
        ])
    ]);
    
    const proctorModal = el('div', { id: 'proctoring-modal', className: 'modal-overlay' }, [modalContent]);
    proctorModal.querySelector('.modal-close-btn').addEventListener('click', () => {
        proctorModal.classList.remove('visible');
        setTimeout(() => proctorModal.remove(), 300);
    });
    
    document.body.appendChild(proctorModal);
    setTimeout(() => proctorModal.classList.add('visible'), 10);
};

export const renderViewExamModal = (examId) => {
    const state = getState();
    const exam = state.examinations.find(ex => ex.id === examId);
    if (!exam) return;
    
    const viewExamModalContent = el('div', { className: 'view-exam-modal-content' });
    
    examModal = el('div', { className: 'modal-overlay view-exam-modal' }, [
        el('div', { className: 'modal-content' }, [
            el('button', { className: 'modal-close-btn' }, ['×']),
            viewExamModalContent
        ])
    ]);
    examModal.querySelector('.modal-close-btn').addEventListener('click', hideViewExamModal);

    if (state.currentStudent) { // Student taking exam
        const completed = state.completedExams.find(c => c.examId === examId && c.studentId === state.currentStudent.id);
        if (completed && completed.score > 0) { // Check if it's already graded
            showToast('You have already completed this exam.', 'info');
            return;
        }

        const progressKey = `smartschool_examprogress_${state.currentStudent.id}_${exam.id}`;
        const savedProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');

        const proctorView = el('div', { id: 'student-proctor-view' }, [
            el('video', { id: 'student-webcam-feed', autoplay: true, playsinline: true, muted: true, style: {display: 'none'} }),
            el('div', { id: 'student-webcam-placeholder' }, ['📸', el('br'), 'Proctoring Active'])
        ]);
        examModal.appendChild(proctorView);
        startStudentWebcam();
        startProctoringListeners(state.currentStudent.id, exam.id);

        const questionElements = exam.questions.map((q, index) => {
            let answerElement;
            if (q.type === 'mcq') {
                const optionElements = q.options.map((option) => 
                    el('li', {}, [
                        el('label', {}, [
                            el('input', { type: 'radio', name: `question-${index}`, value: option, required: true, checked: savedProgress[index] === option }),
                            el('span', {}, [option])
                        ])
                    ])
                );
                answerElement = el('ul', { className: 'student-exam-options' }, optionElements);
            } else if (q.type === 'short_answer') {
                answerElement = el('input', { type: 'text', name: `question-${index}`, className: 'form-group', style: {marginTop: '10px'}, value: savedProgress[index] || '' });
            } else { // paragraph
                answerElement = el('textarea', { name: `question-${index}`, className: 'form-group', rows: 5, style: {marginTop: '10px'}, textContent: savedProgress[index] || '' });
            }
        
            return el('div', { className: 'student-exam-question' }, [
                el('p', {}, [`${index + 1}. ${q.question}`]),
                answerElement
            ]);
        });

        const formElement = el('form', { id: 'student-exam-form', 'data-exam-id': exam.id }, [
            ...questionElements,
            el('button', { type: 'submit', id: 'submit-exam-btn', className: 'btn' }, ['Submit Exam'])
        ]);
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            submitAndGradeExam(exam.id);
        });
        
        const modalChildren = [
             el('div', { id: 'exam-timer-container' }, [ el('div', { id: 'exam-timer' }, [`${String(exam.duration).padStart(2, '0')}:00`]) ]),
             el('h3', {}, [exam.title]),
             el('p', {}, [el('strong', {}, ['Instructions: ']), exam.instructions || 'Answer all questions. The exam will be submitted automatically when the timer runs out.']),
             el('hr', { style: { margin: '15px 0' } }),
             formElement
        ];
        renderChildren(viewExamModalContent, modalChildren);

        startExamTimer(exam.duration, exam.id);
        
        if (!completed) { // only add if not already in progress
             api.addCompletedExam({ studentId: state.currentStudent.id, examId: exam.id, score: 0, scaledScore: 0});
        }
       
        if (activeExamProgressSaver) clearInterval(activeExamProgressSaver);
        activeExamProgressSaver = setInterval(() => {
            const currentForm = examModal?.querySelector('#student-exam-form');
            if (!currentForm) {
                clearInterval(activeExamProgressSaver);
                activeExamProgressSaver = null;
                return;
            }
            const progress = {};
            exam.questions.forEach((q, index) => {
                if (q.type === 'mcq') {
                    const selectedOption = currentForm.querySelector(`input[name="question-${index}"]:checked`);
                    if (selectedOption) progress[index] = selectedOption.value;
                } else {
                    const textInput = currentForm.querySelector(`[name="question-${index}"]`);
                    if (textInput) progress[index] = textInput.value;
                }
            });
            localStorage.setItem(progressKey, JSON.stringify(progress));
        }, 5000);

    } else { // Teacher view
        const questionElements = exam.questions.map((q, index) => {
            let answerDisplay;
            if (q.type === 'mcq') {
                const optionElements = q.options?.map((option) => 
                    el('li', { style: { backgroundColor: option === q.answer ? '#d4edda' : 'inherit', borderLeft: option === q.answer ? '3px solid #155724' : 'none' } }, [option])
                ) || [];
                answerDisplay = el('div', {}, [
                    el('ul', { className: 'quiz-options' }, optionElements),
                    el('p', { className: 'quiz-answer' }, [`Correct Answer: ${q.answer}`])
                ]);
            } else { // short_answer or paragraph
                answerDisplay = el('div', {}, [
                     el('p', { className: 'quiz-answer' }, [el('strong', {}, ['Model Answer: ']), q.answer])
                ]);
            }
            
            return el('div', { className: 'quiz-question' }, [
                el('p', {}, [el('strong', {}, [`${index + 1}. (${q.type}) ${q.question}`])]),
                answerDisplay
            ]);
        });

        renderChildren(viewExamModalContent, [
            el('h3', {}, [exam.title]),
            el('div', { className: 'exam-meta' }, [
                el('span', {}, [el('strong', {}, ['For: ']), exam.className]),
                el('span', {}, [el('strong', {}, ['Duration: ']), `${exam.duration} minutes`])
            ]),
            el('p', {}, [el('strong', {}, ['Instructions: ']), exam.instructions || 'N/A']),
            el('hr', { style: { margin: '15px 0' } }),
            ...questionElements
        ]);
    }
    
    document.body.appendChild(examModal);
    setTimeout(() => examModal.classList.add('visible'), 10);
};

const renderTeacherExamList = (container) => {
    const { examinations, students, completedExams } = getState();
    if (examinations.length === 0) {
        renderChildren(container, [el('p', {}, ['No examinations created yet.'])]);
        return;
    }

    const examElements = examinations.map(exam => {
        const monitorBtn = el('button', { className: 'btn btn-secondary' }, ['Monitor']);
        monitorBtn.addEventListener('click', () => showProctoringModal(exam.id));
        
        const viewBtn = el('button', { className: 'btn btn-info' }, ['View']);
        viewBtn.addEventListener('click', () => renderViewExamModal(exam.id));

        const removeBtn = el('button', { className: 'btn btn-danger' }, ['Delete']);
        removeBtn.addEventListener('click', () => {
            api.removeExamination(exam.id).then(() => {
                showToast('Examination removed.', 'success');
                renderTeacherExamList(container);
            });
        });

        return el('div', { className: 'exam-item', 'data-id': exam.id }, [
            el('div', { className: 'exam-item-info' }, [
                el('h5', {}, [exam.title]),
                el('p', {}, [`For: ${exam.className} | Questions: ${exam.questions?.length ?? 0}`])
            ]),
            el('div', { className: 'exam-item-actions' }, [monitorBtn, viewBtn, removeBtn])
        ]);
    });
    renderChildren(container, examElements);
};

export const renderExaminationView = () => {
    const examListContainer = el('div', { className: 'scrollable-list' });

    const handleCreateExam = async (e) => {
        e.preventDefault();
        const form = e.target;
        const topic = form.querySelector('#exam-topic').value;
        const questionCounts = {
            mcq: parseInt(form.querySelector('#exam-num-mcq').value, 10) || 0,
            short_answer: parseInt(form.querySelector('#exam-num-short').value, 10) || 0,
            paragraph: parseInt(form.querySelector('#exam-num-para').value, 10) || 0,
        };
        const totalQuestions = questionCounts.mcq + questionCounts.short_answer + questionCounts.paragraph;

        if (!topic) {
            showToast('Please enter a topic.', 'error');
            return;
        }
        if (totalQuestions === 0) {
            showToast('Please specify at least one question.', 'error');
            return;
        }
        
        showSpinner('#exam-creation-card');
        const questions = await geminiService.generateExamQuestions(topic, questionCounts);
        hideSpinner('#exam-creation-card');
        
        if (questions) {
            const examData = {
                title: form.querySelector('#exam-title').value || `${topic} Examination`,
                className: form.querySelector('#exam-class-select').value,
                subject: form.querySelector('#exam-subject').value || topic,
                term: form.querySelector('#exam-term').value,
                duration: parseInt(form.querySelector('#exam-duration').value, 10),
                instructions: form.querySelector('#exam-instructions').value,
                questions: questions,
            };
            await api.addExamination(examData);
            showToast('Examination created successfully!', 'success');
            renderTeacherExamList(examListContainer);
            form.reset();
        }
    };
    
    const { students } = getState();
    const classSelect = el('select', { id: 'exam-class-select' });
    const classes = [...new Set(students.map(s => s.class))].sort();
    classes.forEach(c => classSelect.appendChild(el('option', { value: c }, [c])));
    
    const creationForm = el('form', {}, [
        el('div', { className: 'form-row' }, [
             el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-title'}, ['Exam Title']),
                el('input', { type: 'text', id: 'exam-title', required: true, placeholder: 'e.g., Mid-Term Physics Exam' })
             ]),
             el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-class-select'}, ['For Class']),
                classSelect
             ]),
        ]),
        el('div', { className: 'form-row' }, [
             el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-subject'}, ['Subject']),
                el('input', { type: 'text', id: 'exam-subject', required: true, placeholder: 'e.g., Physics' })
             ]),
             el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-term'}, ['Term']),
                el('select', {id: 'exam-term'}, [
                    el('option', {}, ['First Term']),
                    el('option', {}, ['Second Term']),
                    el('option', {selected: true}, ['Third Term']),
                ])
             ]),
        ]),
         el('div', { className: 'form-group' }, [
            el('label', {htmlFor: 'exam-instructions'}, ['Instructions']),
            el('textarea', { id: 'exam-instructions', rows: 2, placeholder: 'e.g., Answer all questions.' })
         ]),
        el('hr', { style: { margin: '20px 0' } }),
        el('h4', { style: {color: '#555'} }, ['AI Question Generation']),
        el('div', { className: 'form-group' }, [
            el('label', {htmlFor: 'exam-topic'}, ['Topic for Questions']),
            el('input', { type: 'text', id: 'exam-topic', required: true, placeholder: 'e.g., Laws of Motion' })
        ]),
        el('div', { className: 'form-row' }, [
            el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-num-mcq'}, ['Number of MCQs']),
                el('input', {type: 'number', id: 'exam-num-mcq', value: '5', min: '0'})
            ]),
            el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-num-short'}, ['Short Answer']),
                el('input', {type: 'number', id: 'exam-num-short', value: '3', min: '0'})
            ]),
            el('div', { className: 'form-group' }, [
                el('label', {htmlFor: 'exam-num-para'}, ['Paragraph']),
                el('input', {type: 'number', id: 'exam-num-para', value: '2', min: '0'})
            ]),
        ]),
        el('div', { className: 'form-group' }, [
           el('label', {htmlFor: 'exam-duration'}, ['Duration (Minutes)']),
           el('input', { type: 'number', id: 'exam-duration', value: '30', min: '1' })
        ]),
        el('button', { type: 'submit', className: 'btn' }, ['Generate & Create Exam'])
    ]);
    creationForm.addEventListener('submit', handleCreateExam);
    
    const view = el('div', { className: 'tab-content' }, [
        el('div', { className: 'admin-grid-large' }, [
            el('div', { id: 'exam-creation-card', className: 'management-card', style: { position: 'relative' } }, [
                el('div', { className: 'spinner-overlay' }, [el('div', { className: 'spinner' })]),
                el('h3', {}, ['Create New Examination']),
                creationForm
            ]),
            el('div', { className: 'management-card' }, [
                el('h3', {}, ['Manage Examinations']),
                examListContainer
            ])
        ])
    ]);
    
    renderTeacherExamList(examListContainer);
    return view;
};
