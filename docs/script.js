const priceContainers = Array.from(document.querySelectorAll("[data-fit-price]"));

const MAX_PRICE_FONT_SIZE = 76;
const MIN_PRICE_FONT_SIZE = 28;

function fitPriceText(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.style.fontSize = `${MAX_PRICE_FONT_SIZE}px`;

  let fontSize = MAX_PRICE_FONT_SIZE;

  while (fontSize > MIN_PRICE_FONT_SIZE && container.scrollWidth > container.clientWidth) {
    fontSize -= 1;
    container.style.fontSize = `${fontSize}px`;
  }
}

function fitAllPrices() {
  priceContainers.forEach((container) => {
    fitPriceText(container);
  });
}

function schedulePriceFit() {
  window.requestAnimationFrame(() => {
    fitAllPrices();
  });
}

fitAllPrices();
window.addEventListener("resize", schedulePriceFit);
