"use client";

import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

type Project = {
  title: string;
  client: string;
  category: string;
  count: number;
  image: string;
};

const PROJECTS: Project[] = [
  {
    title: "Lumen Magazine Relaunch",
    client: "Lumen Press",
    category: "Editorial",
    count: 4,
    image: "/portfolio-1.jpg",
  },
  {
    title: "Atlas Coffee Co.",
    client: "Atlas Coffee",
    category: "Branding",
    count: 3,
    image: "/portfolio-2.jpg",
  },
  {
    title: "Helio · Solar Tracking",
    client: "Helio Labs",
    category: "Product",
    count: 5,
    image: "/portfolio-3.jpg",
  },
  {
    title: "Praxis Annual Report",
    client: "Praxis Group",
    category: "Print",
    count: 2,
    image: "/portfolio-1.jpg",
  },
  {
    title: "Solas Type Specimen",
    client: "Solas Foundry",
    category: "Typography",
    count: 2,
    image: "/portfolio-2.jpg",
  },
  {
    title: "Drift Mobility",
    client: "Drift",
    category: "App Design",
    count: 6,
    image: "/portfolio-3.jpg",
  },
  {
    title: "Frame Gallery 2024",
    client: "Frame",
    category: "Exhibition",
    count: 3,
    image: "/portfolio-1.jpg",
  },
  {
    title: "Verde Studio Identity",
    client: "Verde Studio",
    category: "Identity",
    count: 4,
    image: "/portfolio-2.jpg",
  },
  {
    title: "Coalesce Festival",
    client: "Coalesce",
    category: "Campaign",
    count: 5,
    image: "/portfolio-3.jpg",
  },
  {
    title: "Nimbus Weather App",
    client: "Nimbus Labs",
    category: "App Design",
    count: 4,
    image: "/portfolio-1.jpg",
  },
  {
    title: "Forge Hardware Launch",
    client: "Forge Inc.",
    category: "Campaign",
    count: 6,
    image: "/portfolio-2.jpg",
  },
  {
    title: "Palette · Art Fair",
    client: "Palette",
    category: "Exhibition",
    count: 3,
    image: "/portfolio-3.jpg",
  },
];

const N = PROJECTS.length;
const ITEM_H = 72; // px per list row
const IMG_H = 430; // image card height
const IMG_SLOT = IMG_H + 32; // card height + gap
const SCROLL_PER_ITEM = 160; // scroll distance that moves one row

export default function Home() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${(N - 1) * SCROLL_PER_ITEM}`,
          pin: true,
          scrub: true,
          // progress (0..1) divided across the rows picks the active one
          onUpdate: (self) => {
            setActive(Math.round(self.progress * (N - 1)));
          },
        },
      });

      // only the list is scrubbed by scroll; the image rail follows the
      // active index on its own smooth tween (see effect below)
      tl.to(listRef.current, { y: -(N - 1) * ITEM_H, ease: "none" }, 0);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // the rail's y depends on the active project: glide it so the active
  // image lands exactly on the center, with a soft settle pop
  useEffect(() => {
    if (railRef.current)
      gsap.to(railRef.current, {
        y: active * IMG_SLOT,
        duration: 0.9,
        ease: "power3.out",
        overwrite: "auto",
      });

    const img = imgRefs.current[active]?.querySelector("img");
    if (img)
      gsap.fromTo(
        img,
        { scale: 1.06 },
        { scale: 1, duration: 0.9, ease: "power3.out", overwrite: "auto" },
      );
  }, [active]);

  return (
    <div className="bg-[#0e0e0d] font-sans text-zinc-100">
      <section
        ref={sectionRef}
        className="relative h-screen w-full overflow-hidden"
      >
        <main className="mx-auto grid h-full w-full max-w-[1400px] grid-cols-1 px-6 sm:px-10 lg:grid-cols-[1.2fr_minmax(0,440px)] lg:gap-16">
          {/* Project list — drifts upward, active row locked to center */}
          <div className="relative h-full overflow-hidden">
            <div ref={listRef} className="absolute left-0 right-0 top-1/2">
              {PROJECTS.map((p, i) => {
                const isActive = i === active;
                return (
                  <div
                    key={p.title}
                    className="absolute left-0 flex w-full items-baseline gap-x-5 text-left"
                    style={{ top: i * ITEM_H, transform: "translateY(-50%)" }}
                  >
                    <span
                      className={`whitespace-nowrap font-display leading-tight tracking-[-0.05em] transition-all duration-100 ${
                        isActive
                          ? "text-[calc(1.875rem+1px)] font-bold text-white sm:text-[calc(2.25rem+1px)] lg:text-[calc(2.6rem+1px)]"
                          : "text-3xl font-medium text-zinc-600 sm:text-4xl lg:text-[2.6rem]"
                      }`}
                    >
                      {p.title}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 transition-opacity duration-100 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {p.client} <span className="mx-1 text-zinc-700">·</span>{" "}
                      {p.category} <span className="mx-1 text-zinc-700">·</span>{" "}
                      {p.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image rail — drifts the opposite way, active image locked to center */}
          <div className="relative hidden h-full overflow-hidden lg:block">
            <div ref={railRef} className="absolute left-0 right-0 top-1/2">
              {PROJECTS.map((p, i) => {
                return (
                  <div
                    key={p.title}
                    ref={(el) => {
                      imgRefs.current[i] = el;
                    }}
                    className="absolute left-0 w-full overflow-hidden rounded-xl"
                    style={{
                      top: -i * IMG_SLOT,
                      height: IMG_H,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="440px"
                      className="object-cover"
                      priority={i < 2}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}
