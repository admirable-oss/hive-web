import { useEffect } from "react";
import { hiveAudio } from "@/lib/audio/hive-audio";

/** Arms the WebAudio unlock-on-gesture listeners for this island; returns `play`. */
export function useHiveAudio() {
  useEffect(() => hiveAudio.attach(), []);
  return hiveAudio.play;
}
