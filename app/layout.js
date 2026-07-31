export const metadata = {
  title: "SiteForge",
  description: "Generate client websites with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "monospace", background: "#0D0E10" }}>
        {children}
      </body>
    </html>
  );
}
