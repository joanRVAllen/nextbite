import type { Metadata } from "next";
import { Navigation } from "./components/navigation";
import "./styles.css";

export const metadata: Metadata = {
  title: "NextBite",
  description: "A meal plan that gets better with every bite."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning><Navigation />{children}</body>
    </html>
  );
}
