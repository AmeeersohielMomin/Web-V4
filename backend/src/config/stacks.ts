/**
 * Multi-language stack definitions for code generation.
 * Used by the AI service to generate projects in different tech stacks.
 */

export interface StackDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  frontend: string;
  backend: string;
  database: string;
  language: string;
  packageManager: string;
  templatePrompt: string;
}

export const STACKS: StackDefinition[] = [
  {
    id: 'nextjs-express-mongo',
    name: 'Next.js + Express + MongoDB',
    label: 'JavaScript Full-Stack',
    description: 'React frontend with Node.js backend and MongoDB database',
    frontend: 'Next.js (React)',
    backend: 'Express.js',
    database: 'MongoDB',
    language: 'TypeScript',
    packageManager: 'npm',
    templatePrompt: 'Generate a full-stack application using Next.js for the frontend, Express.js for the backend API, and MongoDB with Mongoose for the database. Use TypeScript throughout.'
  },
  {
    id: 'react-django-postgres',
    name: 'React + Django + PostgreSQL',
    label: 'Python Full-Stack',
    description: 'React frontend with Django REST backend and PostgreSQL database',
    frontend: 'React (Vite)',
    backend: 'Django',
    database: 'PostgreSQL',
    language: 'Python + TypeScript',
    packageManager: 'pip + npm',
    templatePrompt: 'Generate a full-stack application using React with Vite for the frontend and Django REST Framework for the backend API with PostgreSQL. Use Python for backend and TypeScript for frontend.'
  },
  {
    id: 'vue-laravel-mysql',
    name: 'Vue.js + Laravel + MySQL',
    label: 'PHP Full-Stack',
    description: 'Vue.js frontend with Laravel backend and MySQL database',
    frontend: 'Vue.js 3',
    backend: 'Laravel',
    database: 'MySQL',
    language: 'PHP + TypeScript',
    packageManager: 'composer + npm',
    templatePrompt: 'Generate a full-stack application using Vue.js 3 with composition API for the frontend and Laravel for the backend API with MySQL. Use PHP for backend and TypeScript for frontend.'
  },
  {
    id: 'react-rails-postgres',
    name: 'React + Ruby on Rails + PostgreSQL',
    label: 'Ruby Full-Stack',
    description: 'React frontend with Rails API backend and PostgreSQL database',
    frontend: 'React (Vite)',
    backend: 'Ruby on Rails (API mode)',
    database: 'PostgreSQL',
    language: 'Ruby + TypeScript',
    packageManager: 'gem + npm',
    templatePrompt: 'Generate a full-stack application using React with Vite for the frontend and Ruby on Rails in API mode for the backend with PostgreSQL. Use Ruby for backend and TypeScript for frontend.'
  },
  {
    id: 'htmx-flask-sqlite',
    name: 'HTMX + Flask + SQLite',
    label: 'Lightweight Python',
    description: 'Server-rendered HTMX frontend with Flask backend and SQLite',
    frontend: 'HTMX + Jinja2',
    backend: 'Flask',
    database: 'SQLite',
    language: 'Python',
    packageManager: 'pip',
    templatePrompt: 'Generate a lightweight full-stack application using Flask with HTMX for interactive UI, Jinja2 templates, and SQLite for the database. Keep it simple and Pythonic.'
  },
  {
    id: 'svelte-fastapi-mongo',
    name: 'SvelteKit + FastAPI + MongoDB',
    label: 'Modern Python',
    description: 'SvelteKit frontend with FastAPI backend and MongoDB',
    frontend: 'SvelteKit',
    backend: 'FastAPI',
    database: 'MongoDB',
    language: 'Python + TypeScript',
    packageManager: 'pip + npm',
    templatePrompt: 'Generate a full-stack application using SvelteKit for the frontend and FastAPI for the backend API with MongoDB using Motor/Beanie. Use Python for backend and TypeScript for frontend.'
  }
];

export function getStackById(id: string): StackDefinition | undefined {
  return STACKS.find((s) => s.id === id);
}

export function getDefaultStack(): StackDefinition {
  return STACKS[0];
}
