# Visual Editor

A React 19 application built with Vite for creating a visual editor interface.

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/visual-editor.git
cd visual-editor
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create a `.env` file in the root of your project with the following variables:

```
# Test space
VITE_FIGMA_TOKEN=your_figma_token
VITE_FIGMA_FILE_NAME=your_figma_file_id
VITE_FIGMA_FILE_NAME_THEME=your_theme_figma_file_id

# Neuron space
VITE_FIGMA_TOKEN_NEURON=neuron_figma_token
VITE_FIGMA_FILE_NAME_NEURON=neuron_mapped_file_id
VITE_FIGMA_FILE_NAME_NEURON_THEME=neuron_theme_file_id

# HMH space
VITE_FIGMA_TOKEN_HMH=hmh_figma_token
VITE_FIGMA_FILE_NAME_HMH=hmh_mapped_file_id
VITE_FIGMA_FILE_NAME_HMH_THEME=hmh_theme_file_id
```

### Development

To start the development server:
```bash
npm run dev
```

This will run the app in development mode. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Build

To build the app for production:
```bash
npm run build
```

## Project Structure

- `src/` - Source code
  - `App.tsx` - Main application component
  - `App.css` - Application styles
  - `index.css` - Global styles
  - `main.tsx` - Application entry point
  - `utils/figmaConfig.ts` - Configuration for Figma integration
  - `utils/figmaApi.ts` - API utilities for Figma integration

## Space Configuration

The application supports multiple spaces:

1. **Test Space** - For testing and development
   - Uses `VITE_FIGMA_TOKEN` and `VITE_FIGMA_FILE_NAME`
   - Uses `VITE_FIGMA_FILE_NAME_THEME` for theme variables
   - Allows manual input of file IDs

2. **Neuron Space** - For the Neuron design system
   - Uses `VITE_FIGMA_TOKEN_NEURON` (dedicated token for Neuron)
   - Uses `VITE_FIGMA_FILE_NAME_NEURON` for mapped variables
   - Uses `VITE_FIGMA_FILE_NAME_NEURON_THEME` for theme variables

3. **HMH Space** - For the HMH design system
   - Uses `VITE_FIGMA_TOKEN_HMH` (dedicated token)
   - Uses `VITE_FIGMA_FILE_NAME_HMH` for mapped variables
   - Uses `VITE_FIGMA_FILE_NAME_HMH_THEME` for theme variables

Each space has its own configuration for Figma tokens and file IDs. The space selector in the UI allows switching between these spaces.

## Technologies

- React 19
- TypeScript
- Vite

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Shared Components

### LoadingMessage

A reusable loading message component that displays a spinner and message:

```jsx
import { LoadingMessage } from '../../components/shared';

<LoadingMessage 
  isVisible={isLoading} 
  message="Loading data..." 
/>
```

### ErrorMessage

A reusable error message component:

```jsx
import { ErrorMessage } from '../../components/shared';

<ErrorMessage 
  isVisible={!!errorMessage} 
  message={errorMessage} 
/>
```
