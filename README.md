# Smart School - Comprehensive Education Platform

## 🌟 Introduction

Smart School is a modern, feature-rich single-page application designed to streamline school management and enhance the educational experience. It provides distinct, secure portals for teachers, students, and parents, and integrates powerful AI tools to support teaching, learning, and administration.

The platform is built as a responsive frontend application that communicates with a backend API, making it a flexible and scalable solution for educational institutions.

## ✨ Key Features

-   **Role-Based Portals**:
    -   **Teacher/Admin Portal**: A central hub to manage students, staff, classes, and school-wide data.
    -   **Student Portal**: Allows students to access announcements, take proctored online exams, and interact with a personal AI Study Buddy.
    -   **Parent Portal**: Gives parents a clear view of their children's academic performance, attendance records, and tuition status.
    -   **Creator Portal**: A super-admin dashboard for managing multiple school registrations, subscriptions, and system-wide settings.

-   **AI-Powered Toolkit (Powered by Google Gemini & OpenAI)**:
    -   **Content Generation**: Automatically create quizzes, detailed lesson plans, and complex weekly timetables.
    -   **Automated Grading & Feedback**: Get AI-assisted feedback and suggested scores for student essays, saving teachers valuable time.
    -   **Student Analytics**: Generate insightful reports on school-wide performance and use AI to identify at-risk students for early intervention.
    -   **AI Study Buddy**: A conversational AI tutor available 24/7 to help students with their homework and exam preparation.

-   **Comprehensive School Management**:
    -   **User Management**: Easily add and remove staff, students, and parents.
    -   **Virtual Classroom**: Post school-wide announcements and take daily attendance with a simple interface.
    -   **Assessment Center**: Create a bank of questions and deploy secure, proctored online examinations with automated timers and integrity checks.
    -   **Reporting**: Generate detailed, professional student report cards and track academic progress over time.
    -   **Tuition Tracking**: Monitor and process student tuition payments to manage school finances.

## 💻 Tech Stack

-   **Frontend**: HTML5, CSS3, TypeScript/JavaScript (ES Modules)
-   **AI Integration**:
    -   Google Gemini API (`@google/genai`)
    -   OpenAI API (GPT-4o Mini)
-   **Backend**: The application is designed to connect to a RESTful API backend (e.g., Node.js/Express) hosted on a platform like `Render.com`.

## 📂 Project Structure

The project follows a modular structure to keep the codebase organized and maintainable.

```
.
├── index.html          # Main HTML entry point, includes the import map for modules
├── index.tsx           # Core application logic, state initialization, and view routing
├── index.css           # Global styles and CSS variables for theming
├── README.md           # Project documentation (this file)
└── src/
    ├── api.js          # Handles all communication with the backend API
    ├── state.js        # Global state management (getter/setter)
    ├── router.js       # Simple client-side view router for the teacher shell
    ├── services/       # AI service integrations
    │   ├── ai.js       # Service dispatcher for selecting the active AI provider
    │   ├── gemini.js   # Google Gemini API implementation
    │   └── openai.js   # OpenAI API implementation
    └── ui/
        ├── dom-utils.js # Helper functions for creating and manipulating DOM elements
        ├── views/       # Contains rendering logic for all pages and components
        └── utils.js     # General utility functions
```

## 🚀 Getting Started

### Prerequisites

-   A modern web browser (Chrome, Firefox, Edge).
-   A local web server to serve the files. The app uses ES modules, which require being served over HTTP/HTTPS.
    -   A simple way is using a tool like the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for VS Code.
    -   Alternatively, you can use Python's built-in server from your project's root directory:
        ```bash
        # Using Python 3
        python -m http.server
        ```

### Configuration

The application requires an API key for its AI features.

1.  **Select AI Provider**: In the application's teacher portal, click the settings icon (⚙️) in the header. You can choose between **Google Gemini** (default) or **OpenAI**.
2.  **Provide API Key**:
    -   **Gemini**: The application is configured to use an API key provided through `process.env.API_KEY`. In a development environment like Google's AI Studio, this is handled for you.
    -   **OpenAI**: If you select OpenAI, you must provide your own API key in the settings modal. This key is stored securely in your browser's `localStorage` and is **never** sent to the application's backend server.

## 📖 Usage

### Logging In

The application provides three distinct login portals on the main page:

1.  **Teacher/Admin Login**: Use a `School Code` and `Staff ID`.
2.  **Student Login**: Use a `Student ID` and a unique `Access Code` generated by an administrator.
3.  **Parent Login**: Use a `Parent ID` and a unique `Access Code`.

#### Special Access (Creator)

-   To access the powerful **Creator Panel**, use the following credentials in the **Teacher Login** tab:
    -   **School Code**: `xxamanie`
    -   **Creator Password**: (Enter any text, the current logic only checks the school code)

### Navigating the App

Once logged in, the sidebar provides access to all features available for your role. The application is a Single-Page App (SPA), so navigation is fast and does not require full page reloads.
