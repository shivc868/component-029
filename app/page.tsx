"use client";

import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
    image: "/portfolio-4.jpg",
  },
  {
    title: "Solas Type Specimen",
    client: "Solas Foundry",
    category: "Typography",
    count: 2,
    image: "/portfolio-5.jpg",
  },
  {
    title: "Drift Mobility",
    client: "Drift",
    category: "App Design",
    count: 6,
    image: "/portfolio-6.jpg",
  },
  {
    title: "Frame Gallery 2024",
    client: "Frame",
    category: "Exhibition",
    count: 3,
    image: "/portfolio-7.jpg",
  },
  {
    title: "Verde Studio Identity",
    client: "Verde Studio",
    category: "Identity",
    count: 4,
    image: "/portfolio-8.jpg",
  },
  {
    title: "Coalesce Festival",
    client: "Coalesce",
    category: "Campaign",
    count: 5,
    image: "/portfolio-9.jpg",
  },
  {
    title: "Nimbus Weather App",
    client: "Nimbus Labs",
    category: "App Design",
    count: 4,
    image: "/portfolio-10.jpg",
  },
  {
    title: "Forge Hardware Launch",
    client: "Forge Inc.",
    category: "Campaign",
    count: 6,
    image: "/portfolio-11.jpg",
  },
  {
    title: "Palette · Art Fair",
    client: "Palette",
    category: "Exhibition",
    count: 3,
    image: "/portfolio-12.jpg",
  },
];

const N = PROJECTS.length;
const ITEM_H = 72; // px per list row
const IMG_H = 520; // image card height
const IMG_SLOT = IMG_H + 16; // card height + gap
const SCROLL_PER_ITEM = 100; // scroll distance that moves one row

export default function Home() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  // true while the close animation plays: the overlay stays mounted and
  // fades while the image flips home, then everything unmounts
  const [closing, setClosing] = useState(false);
  // while the FLIP runs, overflow clipping is lifted so the travelling
  // title/image never get cut off at container edges
  const [flipping, setFlipping] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const detailImgRef = useRef<HTMLDivElement>(null);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  // the source rects of the two shared elements, snapshotted right before
  // the layout switches — the morph starts exactly from these
  const flipState = useRef<{ image: DOMRect; title: DOMRect } | null>(null);

  // live SplitText instances for the open detail view, reverted on close
  const splitsRef = useRef<SplitText[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);

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

  // shared-element morph: snapshot where the title + image sit in the
  // current layout, then (after the other layout renders) start them from
  // that exact rect and tween to their natural position — plain measured
  // geometry, so the travel path is fully pre-computed
  const openDetail = () => {
    const card = imgRefs.current[active];
    const span = titleRefs.current[active];
    if (!card || !span) return;

    // if the settle-pop is mid-flight, land the photo at scale 1 first —
    // otherwise the overlay copy (at scale 1) reads as a sudden shrink
    const img = card.querySelector("img");
    if (img) {
      gsap.killTweensOf(img);
      gsap.set(img, { scale: 1 });
    }

    flipState.current = {
      image: card.getBoundingClientRect(),
      title: span.getBoundingClientRect(),
    };

    // settle the rail glide *after* capture: the morph starts from the
    // card's current visual spot, but its resting spot (the close morph's
    // landing target) is final rather than mid-tween
    if (railRef.current) {
      gsap.killTweensOf(railRef.current);
      gsap.set(railRef.current, { y: active * IMG_SLOT });
    }

    window.dispatchEvent(new Event("lenis:stop"));
    setFlipping(true);
    setOpen(active);
  };

  const closeDetail = () => {
    if (closing) return;
    const img = detailImgRef.current;
    const title = detailTitleRef.current;
    if (!img || !title) return;
    flipState.current = {
      image: img.getBoundingClientRect(),
      title: title.getBoundingClientRect(),
    };
    // if the open morph is still mid-flight, freeze it where it is — the
    // rects captured above start the close morph from that exact spot
    gsap.killTweensOf([img, title]);
    setFlipping(true);
    // keep the overlay mounted: it fades away while the image flips home.
    // NOTE: lenis restarts in the morph's onComplete — restarting here lets
    // a scroll move the landing card while the morph flies toward it
    setClosing(true);
  };

  useLayoutEffect(() => {
    const snap = flipState.current;
    if (!snap) return;
    flipState.current = null;

    const isClosing = closing;

    // the elements that travel in THIS direction: opening they are the
    // detail title/image, closing they are the list title / rail card
    const imgEl = isClosing
      ? open !== null
        ? imgRefs.current[open]
        : null
      : detailImgRef.current;
    const titleEl = isClosing
      ? open !== null
        ? titleRefs.current[open]
        : null
      : detailTitleRef.current;

    // pre-computed morph: measure the element's natural rect in the NEW
    // layout, start it transformed onto the snapshotted source rect, and
    // tween back to identity — position and scale are exact on both ends
    const morph = (
      el: HTMLElement | null,
      from: DOMRect,
      onComplete?: () => void,
    ) => {
      if (!el) {
        onComplete?.();
        return;
      }
      const to = el.getBoundingClientRect();
      gsap.set(el, { zIndex: 60 });
      gsap.fromTo(
        el,
        {
          x: from.left - to.left,
          y: from.top - to.top,
          scaleX: from.width / to.width,
          scaleY: from.height / to.height,
          transformOrigin: "0 0",
        },
        {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 1,
          // symmetric ease: accelerates gently out of the old layout and
          // decelerates into the new one — no harsh full-speed launch frame
          ease: "expo.inOut",
          overwrite: "auto",
          onComplete: () => {
            gsap.set(el, { clearProps: "zIndex" });
            onComplete?.();
          },
        },
      );
    };

    morph(titleEl, snap.title);
    morph(imgEl, snap.image, () => {
      setFlipping(false);
      if (isClosing) {
        // unwrap the SplitText line masks before the overlay unmounts
        splitsRef.current.forEach((s) => s.revert());
        splitsRef.current = [];
        setOpen(null);
        setClosing(false);
        // resume scrolling only once the morph has landed — earlier and a
        // scroll would drag the landing card out from under the flip
        window.dispatchEvent(new Event("lenis:start"));
      } else if (open !== null) {
        // the rail card + list title faded out during the open morph —
        // restore them now, safely hidden behind the opaque overlay cover
        if (imgRefs.current[open])
          gsap.set(imgRefs.current[open], { clearProps: "opacity" });
        if (titleRefs.current[open])
          gsap.set(titleRefs.current[open], { clearProps: "opacity" });
      }
    });

    if (!isClosing && open !== null) {
      // opening: the original rail card crossfades out underneath its
      // travelling copy (identical pixels, so the overlap is invisible).
      // The list title is hidden INSTANTLY instead — the h1 copy never
      // aligns glyph-for-glyph with the span, so any crossfade reads as
      // doubled text
      if (imgRefs.current[open])
        gsap.to(imgRefs.current[open], {
          opacity: 0,
          duration: 0.35,
          ease: "power2.out",
        });
      if (titleRefs.current[open])
        gsap.set(titleRefs.current[open], { opacity: 0 });

      // the layout splits open like two solid blocks: EVERYTHING above the
      // active element travels a full screen-height up and out, everything
      // below travels down and out — no stagger, both groups move as one,
      // carving out the empty stage the detail content lands on. NOTE the
      // rail stacks inverted (higher index = higher card), so the cards
      // take the OPPOSITE sign of the list rows. (y goes on the
      // spans/cards themselves — the row divs keep their translateY(-50%)
      // centering untouched, rows only fade)
      const push = window.innerHeight;
      for (let i = 0; i < N; i++) {
        if (i === open) continue;
        const dirText = i < open ? -1 : 1;
        const dirCard = -dirText;
        const span = titleRefs.current[i];
        const row = span?.parentElement;
        const card = imgRefs.current[i];
        // the slide runs the full 0.8s, but the fade finishes early — by
        // the time the detail content rises into the same area the
        // outgoing rows are already dim, so nothing reads as overlapping
        if (card) {
          gsap.to(card, {
            y: dirCard * push,
            duration: 0.8,
            ease: "power2.in",
            overwrite: "auto",
          });
          gsap.to(card, {
            opacity: 0,
            duration: 0.4,
            ease: "power1.out",
            overwrite: "auto",
          });
        }
        if (span)
          gsap.to(span, {
            y: dirText * push,
            duration: 0.8,
            ease: "power2.in",
            overwrite: "auto",
          });
        if (row)
          gsap.to(row, {
            opacity: 0,
            duration: 0.4,
            ease: "power1.out",
            overwrite: "auto",
          });
      }

      // opening: the dark cover and the content ease in around the morph
      gsap.from("[data-overlay-bg]", {
        opacity: 0,
        duration: 0.6,
        ease: "power2.inOut",
        clearProps: "opacity",
      });

      // text content: split into lines, each line rises out of its own
      // overflow mask with a stagger — the classic line-mask reveal
      splitsRef.current = [];
      document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
        });
        splitsRef.current.push(split);
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 0.85,
          delay: 0.35,
          stagger: 0.08,
          ease: "power3.out",
        });
      });

      // back button + CTA: quick rise-in — starts early and travels only a
      // little, so the bottom button never hangs outside the view
      gsap.from("[data-detail-fade]", {
        opacity: 0,
        y: 16,
        duration: 0.5,
        delay: 0.3,
        stagger: 0.07,
        ease: "power3.out",
        clearProps: "all",
      });
    }

    if (isClosing) {
      // if the open was interrupted mid-flip, the rail card / list title may
      // still be faded — they're the travelling elements now: show them
      if (open !== null) {
        [imgRefs.current[open], titleRefs.current[open]].forEach((el) => {
          if (el) {
            gsap.killTweensOf(el, "opacity");
            gsap.set(el, { clearProps: "opacity" });
          }
        });

        // the two blocks close back in around the returning image/title:
        // the upper block descends as one from off-screen, the lower block
        // rises as one — no stagger. (cards take the opposite sign: the
        // rail stacks inverted, see the open branch)
        const push = window.innerHeight;
        for (let i = 0; i < N; i++) {
          if (i === open) continue;
          const dirText = i < open ? -1 : 1;
          const dirCard = -dirText;
          const delay = 0.05;
          // the cards hang back a beat longer than the text — the morphing
          // image leads, then its neighbours drop/rise into the rail
          const cardDelay = 0.25;
          // the MOTION starts early (block-close feel), but the elements
          // stay faint until the travelling title/image has crossed their
          // path — visibility only lands once the morph is nearly home,
          // so nothing overlaps mid-air
          const revealDelay = 0.45;
          const span = titleRefs.current[i];
          const row = span?.parentElement;
          const card = imgRefs.current[i];
          if (card) {
            gsap.fromTo(
              card,
              { y: dirCard * push },
              {
                y: 0,
                duration: 0.9,
                delay: cardDelay,
                ease: "power3.out",
                overwrite: "auto",
                clearProps: "transform",
              },
            );
            gsap.fromTo(
              card,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.45,
                delay: revealDelay,
                ease: "power2.out",
                overwrite: "auto",
                clearProps: "opacity",
              },
            );
          }
          if (span)
            gsap.fromTo(
              span,
              { y: dirText * push },
              {
                y: 0,
                duration: 0.9,
                delay,
                ease: "power3.out",
                overwrite: "auto",
                clearProps: "transform",
              },
            );
          if (row)
            gsap.fromTo(
              row,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.45,
                delay: revealDelay,
                ease: "power2.out",
                overwrite: "auto",
                clearProps: "opacity",
              },
            );
        }
      }

      // closing: the big detail image crossfades out in place while the
      // travelling copy heads home; the detail TITLE hides instantly for
      // the same reason as on open — a text crossfade shows as ghosting
      gsap.to("[data-detail-image]", {
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
      });
      gsap.set("[data-detail-title]", { opacity: 0 });

      // closing: everything fades while the image travels home
      gsap.to("[data-overlay-bg]", {
        opacity: 0,
        duration: 0.7,
        ease: "power2.inOut",
      });
      gsap.to("[data-detail-fade], [data-split]", {
        opacity: 0,
        y: 12,
        duration: 0.3,
        ease: "power2.in",
      });
    }
  }, [open, closing]);

  // esc closes the detail view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open !== null) closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing]);

  const detail = open !== null ? PROJECTS[open] : null;

  return (
    <div className="bg-[#0e0e0d] font-sans text-zinc-100">
      <section
        ref={sectionRef}
        className={`relative h-screen w-full ${flipping ? "" : "overflow-hidden"}`}
        // while closing, the section rises above the fixed z-50 overlay:
        // Flip's own zIndex can't cross stacking contexts, so without this
        // the homeward-bound image/title would travel hidden behind the
        // overlay's dark cover
        style={{ zIndex: closing ? 60 : undefined }}
      >
        <main className="mx-auto grid h-full w-full max-w-[1400px] grid-cols-1 px-6 sm:px-10 lg:grid-cols-[1.2fr_minmax(0,440px)] lg:gap-16">
          {/* Project list — drifts upward, active row locked to center */}
          <div
            className={`relative h-full ${flipping ? "" : "overflow-hidden"}`}
          >
            <div
              ref={listRef}
              className="absolute left-0 right-0 top-1/2 will-change-transform"
            >
              {PROJECTS.map((p, i) => {
                const isActive = i === active;
                // focus falloff: the centre title is crisp and bright, the
                // rest blur + dim by their distance from it — nothing ever
                // covers the active row itself
                const dist = Math.abs(i - active);
                return (
                  <div
                    key={p.title}
                    className="absolute left-0 flex w-full items-baseline gap-x-5 text-left"
                    style={{ top: i * ITEM_H, transform: "translateY(-50%)" }}
                  >
                    <span
                      ref={(el) => {
                        titleRefs.current[i] = el;
                      }}
                      className={`whitespace-nowrap font-display leading-tight tracking-[-0.05em] will-change-[transform,opacity] ${
                        isActive
                          ? "text-[calc(1.875rem+1px)] font-bold text-white sm:text-[calc(2.25rem+1px)] lg:text-[calc(2.6rem+1px)]"
                          : "text-3xl font-medium text-zinc-600 sm:text-4xl lg:text-[2.6rem]"
                      }`}
                      style={{
                        opacity: Math.max(0.12, 1 - dist * 0.28),
                        filter: isActive
                          ? "none"
                          : `blur(${Math.min(dist * 1.4, 5)}px)`,
                        transition:
                          "opacity 0.45s ease, filter 0.45s ease, color 0.1s ease",
                      }}
                    >
                      {p.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* spacer column — the rail is positioned at the section level so
              its cards sit on the detail image's center (see below) */}
          <div className="hidden lg:block" />
        </main>

        {/* Image rail — this region matches the detail layout's image column
            exactly (px-10, py-10, half split with gap-16), and the 440px card
            strip is centered inside it: the active card sits on the SAME
            center the big detail image will have, so the FLIP grows it
            outward from its own middle */}
        <div
          className="absolute hidden lg:block"
          style={{
            // full height: neighbouring cards run to the screen edges with
            // no empty cut-off band; the centre still sits at 50vh, matching
            // the detail image, so the FLIP geometry is unchanged
            top: 0,
            bottom: 0,
            left: "calc(50% + 32px)",
            right: 40,
          }}
        >
          <div
            className={`relative h-full w-full ${flipping ? "" : "overflow-hidden"}`}
          >
            <div className="absolute left-1/2 top-1/2 w-[440px] -translate-x-1/2">
              <div
                ref={railRef}
                className="absolute left-0 right-0 top-0 will-change-transform"
              >
                {PROJECTS.map((p, i) => {
                  const isActive = i === active;
                  return (
                    <div
                      key={p.title}
                      ref={(el) => {
                        imgRefs.current[i] = el;
                      }}
                      onClick={() => isActive && open === null && openDetail()}
                      className={`absolute left-0 w-full overflow-hidden rounded-xl will-change-[transform,opacity] ${
                        isActive ? "cursor-pointer" : ""
                      }`}
                      // the -50% centering is baked into `top` (IMG_H / 2)
                      // so the card carries NO resting transform — the close
                      // morph tweens its transform back to plain identity
                      style={{
                        top: -i * IMG_SLOT - IMG_H / 2,
                        height: IMG_H,
                      }}
                    >
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="440px"
                        className="object-cover will-change-transform"
                        priority={i < 2}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project detail — no header, just the project content */}
      {detail && open !== null && (
        <div
          // a click anywhere on the open view sends it home — the back
          // button is just an affordance, not the only way out
          onClick={closeDetail}
          className={`fixed inset-0 z-50 grid grid-cols-1 gap-10 px-6 py-6 sm:px-10 lg:grid-cols-2 lg:gap-16 ${
            closing ? "pointer-events-none overflow-visible" : "overflow-hidden"
          }`}
        >
          {/* dark cover fades in/out separately from the morphing image */}
          <div
            data-overlay-bg
            className="pointer-events-none absolute inset-0 -z-10 bg-[#0e0e0d] will-change-[opacity]"
          />
          {/* Left: content */}
          <div className="flex h-full max-w-xl flex-col">
            <button
              type="button"
              onClick={closeDetail}
              data-detail-fade
              className="group flex w-fit items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400 transition-colors will-change-[transform,opacity] hover:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 transition-colors group-hover:border-zinc-400">
                ←
              </span>
              Back to work
            </button>

            {/* single line + fluid size: the title box keeps the same shape
                as the list row's, so the FLIP is a clean scale, not a
                squash into a re-wrapped block */}
            <h1
              ref={detailTitleRef}
              data-detail-title
              className="mt-10 w-fit origin-top-left whitespace-nowrap font-display text-[clamp(1.5rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.05em] text-white will-change-[transform,opacity]"
            >
              {detail.title}
            </h1>

            <p data-split className="mt-6 leading-7 text-zinc-400">
              A project shaped end to end — from the first concept sketches to
              the final delivered assets.
            </p>

            <p data-split className="mt-6 max-w-md leading-7 text-zinc-400">
              The brief was simple to say and hard to do: make it feel
              effortless. We built the system around a few strict rules — one
              typeface, a tight grid, and photography that breathes — so every
              piece feels like it belongs to the same world.
            </p>

            <div className="mt-12">
              <p
                data-split
                className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500"
              >
                Scope of work
              </p>
              <ul
                data-split
                className="mt-4 space-y-2 text-lg font-medium text-zinc-200"
              >
                <li>Art direction</li>
                <li>Brand identity</li>
                <li>Editorial design</li>
                <li>Motion &amp; interaction</li>
              </ul>
            </div>

            <a
              href="#"
              data-detail-fade
              className="mt-auto inline-flex w-fit items-center gap-3 rounded-full bg-white px-6 py-3.5 font-semibold text-zinc-900 transition-transform will-change-[transform,opacity] hover:scale-[1.03]"
            >
              Hire us for your next one <span aria-hidden>→</span>
            </a>
          </div>

          {/* Right: image — same 440:520 ratio as the rail card, centered on
              the same spot, so the FLIP is a clean proportional scale */}
          <div className="hidden items-center justify-center lg:flex">
            <div
              ref={detailImgRef}
              data-detail-image
              className="relative overflow-hidden rounded-xl will-change-[transform,opacity]"
              // SAME 440:520 ratio as the rail card, as tall as the viewport
              // allows — identical ratios keep the morph a clean uniform
              // scale (100vh - 3rem accounts for the overlay's py-6)
              style={{
                aspectRatio: "440 / 520",
                width: "min(100%, calc((100vh - 3rem) * (440 / 520)))",
              }}
            >
              {/* same `sizes` as the rail card so the browser reuses the
                  already-cached optimized image — no reload flash on open */}
              <Image
                src={detail.image}
                alt={detail.title}
                fill
                sizes="440px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
