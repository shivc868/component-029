"use client";

import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
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
    image: "/arno-senoner-iUvQRvdIhsY-unsplash.webp",
  },
  {
    title: "Atlas Coffee Co.",
    client: "Atlas Coffee",
    category: "Branding",
    count: 3,
    image: "/curology-DGH1u80sZik-unsplash.webp",
  },
  {
    title: "Helio · Solar Tracking",
    client: "Helio Labs",
    category: "Product",
    count: 5,
    image: "/ethan-rougon-qv7I1yvF0ik-unsplash.webp",
  },
  {
    title: "Praxis Annual Report",
    client: "Praxis Group",
    category: "Print",
    count: 2,
    image: "/fernando-andrade-potCPE_Cw8A-unsplash.webp",
  },
  {
    title: "Solas Type Specimen",
    client: "Solas Foundry",
    category: "Typography",
    count: 2,
    image: "/kadarius-seegars-Mxy5gokl8mE-unsplash.webp",
  },
  {
    title: "Drift Mobility",
    client: "Drift",
    category: "App Design",
    count: 6,
    image: "/kiran-ck-cDrIiiptFqE-unsplash.webp",
  },
  {
    title: "Frame Gallery 2024",
    client: "Frame",
    category: "Exhibition",
    count: 3,
    image: "/mathilde-langevin-baKm-5z7ikk-unsplash.webp",
  },
  {
    title: "Verde Studio Identity",
    client: "Verde Studio",
    category: "Identity",
    count: 4,
    image: "/neauthy-skincare-NwAPSDTmxmk-unsplash.webp",
  },
  {
    title: "Coalesce Festival",
    client: "Coalesce",
    category: "Campaign",
    count: 5,
    image: "/ruslan-bardash-4kTbAMRAHtQ-unsplash.webp",
  },
  {
    title: "Nimbus Weather App",
    client: "Nimbus Labs",
    category: "App Design",
    count: 4,
    image: "/sun-lingyan-_H0fjILH5Vw-unsplash.webp",
  },
  {
    title: "Forge Hardware Launch",
    client: "Forge Inc.",
    category: "Campaign",
    count: 6,
    image: "/svitlana-bHsxBjzdWIE-unsplash.webp",
  },
  {
    title: "Palette · Art Fair",
    client: "Palette",
    category: "Exhibition",
    count: 3,
    image: "/taras-chernus-eSIlQfibAo8-unsplash.webp",
  },
];

const N = PROJECTS.length;
const ITEM_H = 72; // px per list row
// rail card size — 2:3 portrait, the SAME ratio as the detail image AND the
// source photos: the morph stays a clean proportional scale and the photos
// show nearly uncropped
const IMG_W = 460;
const IMG_H = 690;
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
  // responsive: below lg the rail fills the screen and the cards size to
  // the viewport (72vw, same 2:3 ratio). The morph measures live rects, so
  // the flip geometry stays exact at any size
  const [isMobile, setIsMobile] = useState(false);
  const [dims, setDims] = useState({ w: IMG_W, h: IMG_H, slot: IMG_SLOT });
  useEffect(() => {
    const measure = () => {
      const mob = window.innerWidth < 1024;
      setIsMobile(mob);
      if (mob) {
        const w = Math.round(window.innerWidth * 0.72);
        const h = Math.round(w * 1.5);
        setDims({ w, h, slot: h + 16 });
      } else {
        setDims({ w: IMG_W, h: IMG_H, slot: IMG_SLOT });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
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
  // cursor-follow "Open" badge over the active card
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgeTextRef = useRef<HTMLSpanElement>(null);
  const follow = useRef<{ x?: (v: number) => void; y?: (v: number) => void }>(
    {},
  );
  // master-hover bookkeeping: latest pointer position, whether the badge is
  // currently on, and the freshest state snapshot for the per-frame check
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const badgeOn = useRef(false);
  const hoverState = useRef({
    active: 0,
    open: null as number | null,
    closing: false,
    flipping: false,
    mob: false,
  });
  useEffect(() => {
    hoverState.current = { active, open, closing, flipping, mob: isMobile };
  }, [active, open, closing, flipping, isMobile]);

  // keep the badge fully INSIDE the card: clamp the cursor position so the
  // pill (plus a little breathing room) never pokes past the image edges
  const clampToCard = (card: HTMLElement, x: number, y: number) => {
    const r = card.getBoundingClientRect();
    const halfW = (badgeRef.current?.offsetWidth ?? 0) / 2 + 10;
    const halfH = (badgeRef.current?.offsetHeight ?? 0) / 2 + 10;
    return {
      x: Math.min(Math.max(x, r.left + halfW), r.right - halfW),
      y: Math.min(Math.max(y, r.top + halfH), r.bottom - halfH),
    };
  };

  // one badge, two labels: "OPEN" over the list card, "CLOSE" over the
  // detail image — pops in, scramble-decodes its label, trails the cursor
  const showBadge = (
    label: string,
    card: HTMLElement,
    cx: number,
    cy: number,
  ) => {
    if (!badgeRef.current) return;
    badgeOn.current = true;
    gsap.set(badgeRef.current, clampToCard(card, cx, cy));
    gsap.to(badgeRef.current, {
      scale: 1,
      opacity: 1,
      duration: 0.45,
      ease: "back.out(1.7)",
      overwrite: "auto",
    });
    if (badgeTextRef.current)
      gsap.to(badgeTextRef.current, {
        duration: 1.2,
        scrambleText: {
          text: label,
          chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          speed: 0.6,
        },
        overwrite: "auto",
      });
  };
  const moveBadge = (card: HTMLElement, cx: number, cy: number) => {
    const pos = clampToCard(card, cx, cy);
    follow.current.x?.(pos.x);
    follow.current.y?.(pos.y);
  };
  const hideBadge = () => {
    if (!badgeRef.current) return;
    badgeOn.current = false;
    gsap.to(badgeRef.current, {
      scale: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power3.in",
      overwrite: "auto",
    });
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

    // the badge trails the cursor on a soft lerp — quickTo re-targets the
    // same tween every mousemove, which is what gives the floaty feel
    if (badgeRef.current) {
      gsap.set(badgeRef.current, {
        xPercent: -50,
        yPercent: -50,
        scale: 0,
        opacity: 0,
      });
      follow.current.x = gsap.quickTo(badgeRef.current, "x", {
        duration: 0.45,
        ease: "power3",
      });
      follow.current.y = gsap.quickTo(badgeRef.current, "y", {
        duration: 0.45,
        ease: "power3",
      });
    }

    // MASTER HOVER: instead of per-element enter/leave events, every frame
    // we hit-test the pointer against the one element that matters right
    // now (active rail card, or the detail image when open). The badge
    // appears the moment the cursor is truly over the image — even when
    // the image slides under a stationary cursor — and leaves otherwise.
    const onMouseMove = (e: MouseEvent) => {
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);
    const masterHover = () => {
      const m = lastMouse.current;
      if (!m) return;
      const s = hoverState.current;
      // no cursor on touch layouts — the static tap-hint pills take over
      if (s.mob) {
        if (badgeOn.current) hideBadge();
        return;
      }
      let el: HTMLElement | null = null;
      let label = "OPEN";
      if (!s.flipping && !s.closing) {
        if (s.open === null) el = imgRefs.current[s.active];
        else {
          el = detailImgRef.current;
          label = "CLOSE";
        }
      }
      if (el) {
        const r = el.getBoundingClientRect();
        const inside =
          m.x >= r.left && m.x <= r.right && m.y >= r.top && m.y <= r.bottom;
        if (inside) {
          if (badgeOn.current) moveBadge(el, m.x, m.y);
          else showBadge(label, el, m.x, m.y);
          return;
        }
      }
      if (badgeOn.current) hideBadge();
    };
    gsap.ticker.add(masterHover);

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

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      gsap.ticker.remove(masterHover);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the rail's y depends on the active project: glide it so the active
  // image lands exactly on the center, with a soft settle pop
  useEffect(() => {
    if (railRef.current)
      gsap.to(railRef.current, {
        y: active * dims.slot,
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

    // mobile tap-hint: pop the pill in and scramble its label every time a
    // new card settles into the centre
    const hint =
      imgRefs.current[active]?.querySelector<HTMLElement>("[data-tap-hint]");
    if (hint) {
      gsap.fromTo(
        hint,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.45,
          delay: 0.2,
          ease: "back.out(1.7)",
          overwrite: "auto",
        },
      );
      const label = hint.querySelector("span");
      if (label)
        gsap.to(label, {
          duration: 1,
          scrambleText: {
            text: "OPEN",
            chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            speed: 0.6,
          },
          overwrite: "auto",
        });
    }
  }, [active, dims.slot]);

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
      gsap.set(railRef.current, { y: active * dims.slot });
    }

    // the badge bows out as the card takes over the screen
    if (badgeRef.current)
      gsap.to(badgeRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.25,
        ease: "power3.in",
        overwrite: "auto",
      });

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
    hideBadge();
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
      // where the element lands relative to its natural layout size —
      // 1.1 lets the detail title settle 10% larger than its CSS size
      endScale = 1,
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
          scaleX: endScale,
          scaleY: endScale,
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

    // opening, the detail title lands 10% larger than its CSS size;
    // closing, the list title returns to exactly its natural size
    morph(titleEl, snap.title, undefined, isClosing ? 1 : 1.1);
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
      // overflow mask with a stagger — the classic line-mask reveal.
      // Held until ~0.75s: the travelling title (1s expo.inOut) is ~97%
      // home by then, so the rising lines never cross its flight path
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
          delay: 0.55,
          stagger: 0.08,
          ease: "power3.out",
        });
      });

      // back button + CTA: rise-in only once the title has landed — they
      // travel just a little, so the bottom button never hangs off-view
      gsap.from("[data-detail-fade]", {
        opacity: 0,
        y: 16,
        duration: 0.5,
        delay: 0.5,
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
    <div className="bg-[#121410] font-sans text-[#f1f2ea]">
      {/* cursor-follow "Open" badge — lives above the rail, below the
          detail overlay; pointer-events off so clicks pass through */}
      <div
        ref={badgeRef}
        // difference blend: the white pill inverts whatever image is under
        // it, so the badge stays readable on ANY photo — bright or dark
        className="pointer-events-none fixed left-0 top-0 z-[70] scale-0 opacity-0 rounded-md bg-white px-3.5 py-1.5 text-[16px] font-black uppercase tracking-[0.2em] text-black mix-blend-difference will-change-transform"
      >
        {/* fixed-width slot so the scramble never changes the pill's size */}
        <span ref={badgeTextRef} className="inline-block w-[4em] text-center">
          OPEN
        </span>
      </div>
      <section
        ref={sectionRef}
        className={`relative h-screen w-full ${flipping ? "" : "overflow-hidden"}`}
        // while closing, the section rises above the fixed z-50 overlay:
        // Flip's own zIndex can't cross stacking contexts, so without this
        // the homeward-bound image/title would travel hidden behind the
        // overlay's dark cover
        style={{ zIndex: closing ? 60 : undefined }}
      >
        {/* Image rail — painted BENEATH the title list: it comes first in
            the DOM and both are positioned, so DOM order decides. On
            desktop it matches the detail layout's image column exactly; on
            mobile it fills the screen, the cards centre on it, and the
            titles blend over the photo */}
        <div
          className="absolute"
          style={
            isMobile
              ? { top: 0, bottom: 0, left: 0, right: 0 }
              : { top: 0, bottom: 0, left: "calc(50% + 32px)", right: 40 }
          }
        >
          <div
            className={`relative h-full w-full ${flipping ? "" : "overflow-hidden"}`}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2"
              style={{ width: dims.w }}
            >
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
                      className={`absolute left-0 w-full overflow-hidden rounded-md border border-white/10 will-change-[transform,opacity] ${
                        isActive ? "cursor-pointer" : ""
                      }`}
                      // the -50% centering is baked into `top` (dims.h / 2)
                      // so the card carries NO resting transform — the close
                      // morph tweens its transform back to plain identity
                      style={{
                        top: -i * dims.slot - dims.h / 2,
                        height: dims.h,
                      }}
                    >
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="460px"
                        className="object-cover will-change-transform"
                        priority={i < 2}
                      />
                      {/* mobile tap affordance — the cursor badge's little
                          sibling: same white pill, same difference blend */}
                      {isActive && open === null && (
                        <div
                          data-tap-hint
                          className="absolute bottom-4 left-0 right-0 mx-auto w-fit rounded-md bg-white px-3 py-1.5 text-[13px] font-black uppercase tracking-[0.2em] text-black mix-blend-difference lg:hidden"
                        >
                          <span className="inline-block w-[4em] text-center">
                            OPEN
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* the list paints ABOVE the rail (it comes later in the DOM) but
            never takes the pointer — the cards below receive the clicks */}
        <main className="pointer-events-none relative mx-auto grid h-full w-full max-w-[1400px] grid-cols-1 px-6 sm:px-10 lg:grid-cols-[1.2fr_minmax(0,440px)] lg:gap-16">
          {/* Project list — drifts upward, active row locked to center */}
          <div
            className={`relative h-full ${flipping ? "" : "overflow-hidden"}`}
          >
            <div
              ref={listRef}
              // the list is a stacking context (will-change) — putting the
              // difference blend on IT lets the whole title stack invert
              // whatever photo passes underneath on mobile
              className="absolute left-0 right-0 top-1/2 mix-blend-difference will-change-transform lg:mix-blend-normal"
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
                    className="absolute left-0 flex w-full items-baseline justify-center gap-x-5 text-center lg:justify-start lg:text-left"
                    style={{ top: i * ITEM_H, transform: "translateY(-50%)" }}
                  >
                    <span
                      ref={(el) => {
                        titleRefs.current[i] = el;
                      }}
                      className={`whitespace-nowrap font-display leading-tight tracking-[-0.04em] will-change-[transform,opacity] ${
                        isActive
                          ? "text-[6.5vw] font-medium text-white sm:text-4xl lg:text-[2.6rem] lg:text-[#d3f26a]"
                          : "text-[6.5vw] font-medium text-white sm:text-4xl lg:text-[2.6rem] lg:text-[#5c6152]"
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

      </section>

      {/* Project detail — no header, just the project content */}
      {detail && open !== null && (
        <div
          // a click anywhere on the open view sends it home — the back
          // button is just an affordance, not the only way out
          onClick={closeDetail}
          // NOTE: no data-lenis-prevent here — Lenis honours that attribute
          // *before* its stopped-check, so wheel/touch over the overlay would
          // fall through to native scroll and drag the page behind the view
          // mobile: a compact flex column (title → image → copy → CTA) that
          // fits ONE viewport, nothing scrolls; desktop: the unchanged
          // two-column grid
          className={`fixed inset-0 z-50 flex flex-col gap-4 px-6 py-6 sm:px-10 lg:grid lg:grid-cols-2 lg:gap-16 ${
            closing ? "pointer-events-none overflow-visible" : "overflow-hidden"
          }`}
        >
          {/* dark cover fades in/out separately from the morphing image */}
          <div
            data-overlay-bg
            // fixed, not absolute: the overlay scrolls on mobile, and an
            // absolute cover only spans the first viewport-height of the
            // content — the pinned rail would ghost through below it
            className="pointer-events-none fixed inset-0 -z-10 bg-[#121410] will-change-[opacity]"
          />
          {/* Left: content — on mobile the wrapper dissolves
              (display: contents) so the image can slot in right after the
              title via flex order */}
          <div className="flex h-full max-w-2xl flex-col max-lg:contents">
            <button
              type="button"
              onClick={closeDetail}
              data-detail-fade
              aria-label="Back to work"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d3f26a] text-lg text-[#121410] transition-colors will-change-[transform,opacity] hover:bg-[#f1f2ea] max-lg:hidden"
            >
              ←
            </button>

            {/* single line + fluid size: the title box keeps the same shape
                as the list row's, so the FLIP is a clean scale, not a
                squash into a re-wrapped block */}
            <h1
              ref={detailTitleRef}
              data-detail-title
              className="mt-10 w-fit origin-top-left whitespace-nowrap font-display text-[clamp(1.5rem,4.5vw,3rem)] font-medium leading-tight tracking-[-0.04em] text-[#d3f26a] will-change-[transform,opacity] max-lg:mt-2"
            >
              {detail.title}
            </h1>

            <p
              data-split
              className="mt-6 leading-7 text-[#a8ab99] max-lg:order-1 max-lg:mt-0 max-lg:text-[13px] max-lg:leading-5"
            >
              A project shaped end to end — from the first concept sketches to
              the final delivered assets. The brief was simple to say and hard
              to do: make it feel effortless, so we built the system around a
              few strict rules — one typeface, a tight grid, and photography
              that breathes — until every piece felt like it belongs to the same
              world.
            </p>

            {/* mobile: mt-auto pushes the scope block (and the CTA after
                it) to the bottom edge so the column fills the viewport */}
            <div className="mt-12 max-lg:order-1 max-lg:mt-auto">
              <p
                data-split
                className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9fae6e]"
              >
                Scope of work
              </p>
              <ul
                data-split
                // mobile: the scope items wrap inline to save vertical room
                className="mt-4 space-y-2 text-lg font-medium text-[#f1f2ea] max-lg:mt-2 max-lg:flex max-lg:flex-wrap max-lg:gap-x-4 max-lg:gap-y-1 max-lg:space-y-0 max-lg:text-sm"
              >
                <li>Art direction</li>
                <li>Brand identity</li>
                <li>Editorial design</li>
                <li>Motion &amp; interaction</li>
              </ul>
            </div>

            <button
              type="button"
              data-detail-fade
              // the CTA is an action of its own — its click must not bubble
              // to the overlay's click-anywhere-to-close handler
              onClick={(e) => e.stopPropagation()}
              // hover scale runs through GSAP too — a CSS transition on
              // transform would re-interpolate every frame the entrance/exit
              // tween writes, so the two would fight and smear the motion
              onMouseEnter={(e) =>
                gsap.to(e.currentTarget, {
                  scale: 1.03,
                  duration: 0.3,
                  ease: "power2.out",
                })
              }
              onMouseLeave={(e) =>
                gsap.to(e.currentTarget, {
                  scale: 1,
                  duration: 0.3,
                  ease: "power2.out",
                })
              }
              className="mt-auto inline-flex w-fit items-center rounded-md bg-[#d3f26a] px-7 py-3.5 font-semibold text-[#121410] transition-colors will-change-[transform,opacity] hover:bg-[#f1f2ea] hover:text-[#121410] max-lg:order-1 max-lg:mt-3 max-lg:px-5 max-lg:py-2.5 max-lg:text-sm"
            >
              Hire us for your next one
            </button>
          </div>

          {/* Right: image — same 2:3 ratio as the rail card, centered on
              the same spot, so the FLIP is a clean proportional scale. On
              mobile it sits in the column flow right after the title */}
          <div className="flex items-center justify-center">
            <div
              ref={detailImgRef}
              data-detail-image
              className="relative overflow-hidden rounded-md border border-white/10 will-change-[transform,opacity]"
              // SAME 2:3 ratio as the rail card on BOTH breakpoints — the
              // morph stays a clean uniform scale. Mobile caps the image at
              // 36vh so title + copy + CTA all fit one viewport with it
              style={
                isMobile
                  ? { aspectRatio: "2 / 3", width: "calc(36vh * (2 / 3))" }
                  : {
                      aspectRatio: "2 / 3",
                      width: "min(100%, calc((100vh - 3rem) * (2 / 3)))",
                    }
              }
            >
              {/* same `sizes` as the rail card so the browser reuses the
                  already-cached optimized image — no reload flash on open */}
              <Image
                src={detail.image}
                alt={detail.title}
                fill
                sizes="690px"
                className="object-cover"
                priority
              />
              {/* mobile close affordance — travels with the image since
                  it lives inside the morphing element */}
              <div className="absolute bottom-4 left-0 right-0 z-10 mx-auto w-fit rounded-md bg-white px-3 py-1.5 text-[13px] font-black uppercase tracking-[0.2em] text-black mix-blend-difference lg:hidden">
                CLOSE
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
