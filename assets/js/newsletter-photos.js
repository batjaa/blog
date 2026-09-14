// Email keeps the table gallery. The web enhances it without hiding photos
// when JavaScript is unavailable. There is deliberately no autoplay.
const mongolianPhotos = document.documentElement.lang === "mn";
const photoCopy = mongolianPhotos ? {
  gallery: (number) => `Зургийн цомог ${number}`,
  instructions: "Зургууд. Зүүн, баруун сумтай товчоор гүйлгэж үзээрэй.",
  slide: (number, total) => `${total} зургийн ${number}`,
  open: "Зургийг бүтнээр нь нээх",
  openLabel: (number, total) => `${total} зургийн ${number}-г шинэ цонхонд нээх`,
  previous: "Өмнөх зураг",
  next: "Дараах зураг",
  carousel: "зургийн цомог",
  slideRole: "зураг",
} : {
  gallery: (number) => `Photo gallery ${number}`,
  instructions: "Photos. Use the left and right arrow keys to browse.",
  slide: (number, total) => `${number} of ${total}`,
  open: "Open full photo",
  openLabel: (number, total) => `Open photo ${number} of ${total} in a new tab`,
  previous: "Previous photo",
  next: "Next photo",
  carousel: "carousel",
  slideRole: "slide",
};
document.querySelectorAll("[data-photo-gallery]").forEach((table, galleryIndex) => {
  const originals = [...table.querySelectorAll("img")];
  if (originals.length < 2) return;

  const gallery = document.createElement("section");
  gallery.className = "my-6 min-w-0";
  gallery.setAttribute("role", "group");
  gallery.setAttribute("aria-roledescription", photoCopy.carousel);
  gallery.setAttribute("aria-label", photoCopy.gallery(galleryIndex + 1));

  const track = document.createElement("div");
  track.id = `newsletter-photos-${galleryIndex + 1}`;
  track.className = "flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700";
  track.tabIndex = 0;
  track.setAttribute("aria-label", photoCopy.instructions);

  const slides = originals.map((original, index) => {
    const slide = document.createElement("div");
    slide.className = "flex aspect-[4/3] w-full min-w-0 shrink-0 snap-center items-center justify-center";
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", photoCopy.slideRole);
    slide.setAttribute("aria-label", photoCopy.slide(index + 1, originals.length));
    const image = original.cloneNode(true);
    image.removeAttribute("style");
    image.removeAttribute("width");
    image.removeAttribute("height");
    image.className = "block h-full! w-full max-w-full object-contain";
    image.loading = "lazy";
    image.decoding = "async";
    slide.append(image);
    track.append(slide);
    return slide;
  });

  const controls = document.createElement("div");
  controls.className = "mt-3 flex flex-wrap items-center justify-between gap-3";
  const counter = document.createElement("span");
  counter.className = "text-sm font-medium text-slate-700 tabular-nums";
  counter.setAttribute("role", "status");
  counter.setAttribute("aria-atomic", "true");
  const caption = document.createElement("p");
  caption.className = "mt-2 mb-0 text-xs font-normal italic leading-snug text-slate-500";
  const fullSize = document.createElement("a");
  fullSize.className = "text-sm text-blue-700 underline underline-offset-4 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700";
  fullSize.textContent = photoCopy.open;
  fullSize.target = "_blank";
  fullSize.rel = "noopener noreferrer";

  let active = 0;
  const update = () => {
    counter.textContent = `${active + 1} / ${slides.length}`;
    caption.textContent = originals[active].alt;
    fullSize.href = originals[active].src;
    fullSize.setAttribute("aria-label", photoCopy.openLabel(active + 1, slides.length));
    // Keep keyboard focus on the control, even at either end of the gallery.
    previous.setAttribute("aria-disabled", String(active === 0));
    next.setAttribute("aria-disabled", String(active === slides.length - 1));
  };
  const goTo = (index) => {
    active = Math.max(0, Math.min(slides.length - 1, index));
    track.scrollTo({ left: active * track.clientWidth, behavior: "instant" });
    update();
  };
  const button = (label, direction, path) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 aria-disabled:cursor-default aria-disabled:opacity-40";
    element.setAttribute("aria-label", label);
    element.setAttribute("aria-controls", track.id);
    element.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${path}" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
    element.addEventListener("click", () => goTo(active + direction));
    return element;
  };
  const previous = button(photoCopy.previous, -1, "M14 6l-6 6 6 6");
  const next = button(photoCopy.next, 1, "M10 6l6 6-6 6");
  const navigation = document.createElement("div");
  navigation.className = "flex items-center gap-3";
  navigation.append(previous, counter, next);
  controls.append(navigation, fullSize);

  track.addEventListener("keydown", (event) => {
    const destinations = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    goTo(destinations[event.key]);
  });
  let scrollFrame = 0;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (index !== active) {
        active = index;
        update();
      }
    });
  }, { passive: true });

  gallery.append(track, controls, caption);
  table.replaceWith(gallery);
  update();
  new ResizeObserver(() => goTo(active)).observe(track);
});
