import "./globals.css";

export const metadata = {
  title: "heeelp.",
  description: "strong (?) helper.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}