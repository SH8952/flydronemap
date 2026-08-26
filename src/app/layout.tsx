import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DroneWeather",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
