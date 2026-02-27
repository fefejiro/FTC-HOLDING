import React from 'react';
import '../styles/globals.css';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata = {
  title: 'FTC - From Manual Complexity to Intelligent Systems',
  description: 'Consulting for applied artificial intelligence and intelligent systems.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="container">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
