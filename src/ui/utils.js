/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gets the ISO week string for a given date.
 * @param {Date} date The date to get the week string for.
 * @returns {string} The ISO week string (e.g., "2024-W28").
 */
export const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

/**
 * Calculates the letter grade based on a numeric score.
 * @param {number} score The numeric score (0-100).
 * @returns {{ grade: string, className: string }} The letter grade and associated CSS class.
 */
export const getLetterGrade = (score) => {
    if (score >= 80) return { grade: 'A1', className: 'letter-grade-a1' };
    if (score >= 70) return { grade: 'B2', className: 'letter-grade-b2' };
    if (score >= 65) return { grade: 'B3', className: 'letter-grade-b3' };
    if (score >= 60) return { grade: 'C4', className: 'letter-grade-c4' };
    if (score >= 55) return { grade: 'C5', className: 'letter-grade-c5' };
    if (score >= 50) return { grade: 'C6', className: 'letter-grade-c6' };
    if (score >= 45) return { grade: 'D7', className: 'letter-grade-d7' };
    if (score >= 40) return { grade: 'E8', className: 'letter-grade-e8' };
    return { grade: 'F9', className: 'letter-grade-f9' };
};