import type { Metadata } from "next";
import { PracticeStudio } from "@/components/practice/PracticeStudio";

export const metadata: Metadata = {
  title: "Solo Practice · Doodle Riot",
  description: "Draw by yourself with a timer or no timer. Choose a prompt or free draw with colors, brushes, an eraser and undo — then download your sketch.",
};

export default function PracticePage() {
  return <PracticeStudio />;
}
