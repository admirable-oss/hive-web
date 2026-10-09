import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Small, scroll-aware reveals for the docs shell and home page. */
export default function DocsMotionClient() {
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) return;

      const intro = gsap.utils.toArray<HTMLElement>("[data-docs-intro]");
      if (intro.length) {
        gsap.fromTo(
          intro,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.72,
            stagger: 0.09,
            ease: "power3.out",
            delay: 0.08,
            clearProps: "opacity,visibility,transform",
          },
        );
      }

      gsap.utils.toArray<HTMLElement>("[data-hive-reveal]").forEach((item) => {
        gsap.fromTo(
          item,
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.68,
            ease: "power2.out",
            clearProps: "opacity,visibility,transform",
            scrollTrigger: { trigger: item, start: "top 90%", once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-path-icon]").forEach((icon) => {
        const cursor = icon.querySelector<SVGElement>("[data-icon-cursor]");
        const iconIntro = gsap.timeline({
          scrollTrigger: { trigger: icon, start: "top 88%", once: true },
        });
        iconIntro.fromTo(
          icon,
          { autoAlpha: 0, scale: 0.62, rotate: -12 },
          { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.72, ease: "back.out(1.8)" },
        );
        if (cursor) {
          iconIntro.to(cursor, { opacity: 0.2, duration: 0.48, repeat: -1, yoyo: true, ease: "steps(1)" });
        }
      });

      const promptScene = document.querySelector<HTMLElement>("[data-prompt-scene]");
      const bee = document.querySelector<HTMLElement>("[data-prompt-bee]");
      const prompt = document.querySelector<HTMLElement>("[data-typewriter]");
      const status = document.querySelector<HTMLElement>("[data-prompt-status]");
      const cursor = document.querySelector<HTMLElement>("[data-type-caret]");
      const textNode = prompt && Array.from(prompt.childNodes).find((node) => node.nodeType === Node.TEXT_NODE) as Text | undefined;

      const promptBox = document.querySelector<HTMLElement>("[data-prompt-box]");
      if (promptScene && promptBox && bee && prompt && textNode && textNode.textContent) {
        const fullPrompt = textNode.textContent;
        gsap.set(bee, { autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: promptScene,
          start: "top 86%",
          once: true,
          onEnter: () => {
            textNode.textContent = "";
            const sceneRect = promptScene.getBoundingClientRect();
            const promptRect = prompt.getBoundingClientRect();
            const beeHeight = bee.getBoundingClientRect().height;
            const startX = promptRect.left - sceneRect.left - 46;
            const startY = promptRect.top - sceneRect.top - beeHeight * 0.55;
            const progress = { count: 0 };
            gsap.timeline({
              onComplete: () => {
                if (status) status.textContent = "HIVE BEE · PROMPT READY";
                if (cursor) gsap.to(cursor, { autoAlpha: 0, duration: 0.2 });
                const currentScene = promptScene.getBoundingClientRect();
                const currentBox = promptBox.getBoundingClientRect();
                const parkX = currentBox.right - currentScene.left - bee.getBoundingClientRect().width - 8;
                const parkY = currentBox.top - currentScene.top + (currentBox.height - beeHeight) / 2;
                gsap.to(bee, {
                  x: parkX,
                  y: parkY,
                  rotate: 0,
                  duration: 0.48,
                  ease: "power2.inOut",
                  onComplete: () => {
                    gsap.to(bee, {
                      rotate: 4,
                      y: parkY - 2,
                      duration: 0.2,
                      repeat: -1,
                      yoyo: true,
                      ease: "sine.inOut",
                      transformOrigin: "50% 70%",
                    });
                  },
                });
              },
            })
              .fromTo(
                bee,
                { x: promptScene.clientWidth + 24, y: startY - 42, rotate: 17, scale: 0.68, autoAlpha: 0 },
                { x: startX, y: startY, rotate: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: "power3.out" },
              )
              .call(() => {
                if (status) status.textContent = "HIVE BEE · WRITING PROMPT";
                if (cursor) gsap.set(cursor, { autoAlpha: 1 });
              })
              .to(progress, {
                count: fullPrompt.length,
                duration: Math.max(2.2, fullPrompt.length * 0.018),
                ease: "none",
                onUpdate: () => {
                  textNode.textContent = fullPrompt.slice(0, Math.floor(progress.count));
                  if (!textNode.length) return;
                  const range = document.createRange();
                  range.setStart(textNode, 0);
                  range.setEnd(textNode, textNode.length);
                  const rects = range.getClientRects();
                  const tail = rects.item(rects.length - 1);
                  if (!tail) return;
                  const currentScene = promptScene.getBoundingClientRect();
                  const currentBeeHeight = bee.getBoundingClientRect().height;
                  gsap.set(bee, {
                    x: tail.right - currentScene.left + 2,
                    y: tail.top - currentScene.top - currentBeeHeight * 0.52 + Math.sin(progress.count * 0.55) * 2,
                    rotate: Math.sin(progress.count * 0.42) * 4,
                  });
                },
              });
          },
        });
      }

      ScrollTrigger.refresh();
    },
    { dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return null;
}
