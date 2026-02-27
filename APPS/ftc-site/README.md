# FTC Site

Welcome to the Fejiro Technology Consultancy Inc. website project! This Next.js application serves as the corporate website for FTC, showcasing our services, company information, and contact details.

## Project Structure

The project is organized as follows:

```
ftc-site
├── app
│   ├── layout.tsx          # Main layout including header and footer
│   ├── page.tsx            # Home page with hero section and service overview
│   ├── about
│   │   └── page.tsx        # About page detailing company information
│   ├── services
│   │   └── page.tsx        # Services index page linking to individual services
│   ├── contact
│   │   └── page.tsx        # Contact page with consultation scheduling
│   └── components
│       ├── Header.tsx      # Header component with navigation links
│       ├── Footer.tsx      # Footer component with copyright information
│       ├── Hero.tsx        # Hero section component for the home page
│       └── ...
├── public
│   ├── favicon.ico         # Favicon for the website
│   └── ...
├── styles
│   └── globals.css         # Global CSS styles for the application
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration file
├── next.config.js          # Next.js configuration settings
└── README.md               # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ftc-site
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` to view the application.

## Deployment

This project is ready for deployment on Vercel. To deploy:

1. Push your code to a GitHub repository.
2. Sign in to [Vercel](https://vercel.com) and import your GitHub repository.
3. Follow the prompts to deploy your application.

### Custom Subdomain Mapping

If you wish to set up a custom subdomain, follow these steps:

1. Go to your Vercel dashboard.
2. Select your project and navigate to the "Domains" section.
3. Add your custom domain and follow the instructions to configure DNS settings.

## Conclusion

This project is designed to provide a professional digital presence for Fejiro Technology Consultancy Inc. We hope you find it useful and informative. For any questions or contributions, please reach out!