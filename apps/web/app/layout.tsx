import type { Metadata } from "next";
import "./globals.css";
import { ApolloWrapper } from "../lib/apollo-client";

export const metadata: Metadata = {
  title: "ResumeAI — Smart Resume Analyzer & Job Matcher",
  description:
    "AI-powered resume analysis, skill gap detection, and job matching. Get ATS-optimized feedback and improve your resume with Nebius AI.",
  keywords: ["resume analyzer", "AI resume", "job matcher", "ATS optimization", "skill gap"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  );
}
