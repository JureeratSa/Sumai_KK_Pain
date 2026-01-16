import "./globals.css";
import Footer from "@/components/Footer";

import Header from "@/components/ui/Header";

export const metadata = {
  title: "WU Pain Detector",
  description: "This is a sample website built with Next.js.",
  author: "Teerapat Sommaloun",
  keywords: ["Next.js", "JavaScript", "Web Development"],
  language: "en-US",
  robots: "index, follow",
  openGraph: {
    title: "My Awesome Website",
    description: "This is a sample website built with Next.js.",
    url: "https://www.myawesomewebsite.com",
    type: "website",
    images: [
      {
        url: "https://www.myawesomewebsite.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "My Awesome Website"
      }
    ]
  }
};

export const viewport = {
  themeColor: "#ffffff"
}

const layout = ({ children }) => {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-100">
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-grow p-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
};

export default layout;