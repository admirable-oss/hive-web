import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, SplitText);
// Timelines track wall-clock time: on a slow first frame (or a backgrounded
// tab) the intro stays in sync instead of crawling. Canvas loops clamp their
// own frame delta, so physics never explodes.
gsap.ticker.lagSmoothing(0);

export { gsap, SplitText, useGSAP };
