import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Simple static config - the PostCSS warning is non-critical and doesn't affect functionality
// The warning occurs because @tailwindcss/vite processes styles before PostCSS gets them
export default {
  plugins: [
    tailwindcss,
    autoprefixer,
  ],
};
