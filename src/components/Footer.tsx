import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-center p-4 mt-8">
      © {new Date().getFullYear()} Jump Ahead Learning
    </footer>
  );
}
