import type { Metadata, Viewport } from "next";
import { Caveat, Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { themeBootScript } from "../lib/theme";

// Display: headlines, with an italic second line
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Body and UI
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Indexed metadata labels
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Handwriting: only for annotations drawn on the landing demo sheet.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TeamFlow · Sketch, chat and call in one board",
    template: "%s · TeamFlow",
  },
  description:
    "A shared whiteboard with chat, files and video built in. Open a board, invite your team, and work it out together.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the boot script before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${instrument.variable} ${jakarta.variable} ${jetbrains.variable} ${caveat.variable} min-h-dvh`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "!bg-paper !text-ink !border !border-line !shadow-float !rounded-[var(--radius-control)] !font-sans",
              description: "!text-muted",
              actionButton: "!bg-brand !text-on-brand",
            },
          }}
        />
      </body>
    </html>
  );
}
