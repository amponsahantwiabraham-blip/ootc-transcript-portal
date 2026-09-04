import './globals.css';

export const metadata = {
  title: 'OOTC Transcript Portal',
  description: 'Student transcript management and download portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}