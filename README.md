# Emerce AI Chat Application

An AI-powered chat application with concept card generation and database storage features.

## Features

- 💬 AI chat with Gemini models
- 📚 Automatic concept card generation for educational content
- 🗃️ Database storage for chats, messages, and concept cards
- 📋 Todo management with priority tracking
- 🌈 Beautiful UI with animations and responsive design

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A Google AI API key for Gemini

### Environment Variables

Create a `.env` file in the root directory with:

```
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

The application requires several tables in your Supabase database. You can create them automatically through the app's setup UI or manually using SQL.

#### Option 1: Setup through the App

1. Run the application (see below)
2. If the database connection fails, click the "Show Setup SQL" button
3. Copy the SQL and run it in your Supabase SQL Editor
4. Refresh the application

#### Option 2: Manual SQL Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- 1. Create the chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the messages table with a foreign key to chats
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the concept_cards table
CREATE TABLE IF NOT EXISTS concept_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  color_gradient TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create the todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Installation

```bash
npm install
npm run dev
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify your Supabase URL and API key in the `.env` file
2. Check if your tables have been created properly
3. Use the "Show Setup SQL" button to get the correct SQL for table creation
4. Ensure your Supabase project has Row Level Security (RLS) appropriately configured

### Gemini API Issues

If AI responses are not working:

1. Check your Google API key in the `.env` file
2. Verify your API key has access to the Gemini models in the Google AI Studio
3. Check for any quota limitations on your Google AI account

## Technologies

- React with TypeScript
- Google Gemini AI API
- Supabase for database
- Tailwind CSS for styling
- GSAP for animations

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
