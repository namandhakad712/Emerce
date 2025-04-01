# Emerce - AI-Powered Educational Visualization Platform

Emerce is an interactive web application that helps users visualize educational concepts using AI. The platform features a chat interface for interacting with AI models and a concept cards gallery for organizing educational content.

## Features

- **AI Chat Interface:** Chat with AI models to ask questions about various educational topics
- **Persistent Chat History:** All conversations are saved to the database with their respective conversation IDs in chronological order
- **Chat History Navigation:** Access older chats easily through the chat history sidebar
- **Image Upload:** Upload images to get AI analysis and explanations
- **Voice Input:** Use voice commands to interact with the AI (mock implementation)
- **Multiple AI Models:** Choose between different AI models for different types of queries
- **Concept Cards:** Auto-generates educational concept cards from chat interactions
- **Category Filtering:** Filter concept cards by subject area (Physics, Chemistry, Biology, Other)

## Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS
- **AI Integration:** Google Gemini API
- **Database:** Supabase
- **Routing:** React Router
- **Build Tool:** Vite

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Google Gemini API key
- Supabase account and project

### Installation

1. Clone the repository
```
git clone <repository-url>
cd emerce
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the project root with the following variables:
```
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_KEY=your-supabase-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

4. Set up Supabase tables:
   - Create a `chats` table with columns:
     - id (uuid, primary key)
     - title (text)
     - created_at (timestamp)
     - updated_at (timestamp)
     - model (text)
   
   - Create a `messages` table with columns:
     - id (uuid, primary key)
     - role (text)
     - content (text)
     - chat_id (uuid, foreign key to chats.id)
     - created_at (timestamp)
     - attachments (text array)
   
   - Create a `concept_cards` table with columns:
     - id (uuid, primary key)
     - title (text)
     - content (text)
     - category (text)
     - created_at (timestamp)
     - color_gradient (text)

   - Alternatively, you can run the database setup script:
     ```
     npx tsx src/scripts/setup-db.ts
     ```

### Running the Application

```
npm run dev
```

The application will be available at http://localhost:5173

## Usage

1. **Main Chat Page:**
   - Type questions or prompts in the chat input
   - Upload images to analyze them
   - Use the microphone button for voice input
   - Select different AI models from the menu
   - Access chat history from the sidebar menu
   - Start new conversations with the "+" button
   - Navigate to Concept Cards using the grid icon

2. **Chat History:**
   - All messages are automatically saved to the database with their conversation IDs
   - Message timestamps are displayed to show when each message was sent
   - Click on a conversation in the sidebar to load all its messages
   - Rename or delete conversations using the edit and delete buttons

2. **Concept Cards Page:**
   - Filter cards by category using the category tabs
   - Search for specific cards using the search box
   - Return to chat using the back button

## License

[MIT License](LICENSE)

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
