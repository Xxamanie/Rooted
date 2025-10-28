/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { geminiService } from './gemini.js';

// The application now exclusively uses the Gemini service as per API key guidelines.
export const aiService = geminiService;
