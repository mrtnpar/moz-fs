(() => {
  const PRICE_REGEXP = /\$([1-9][0-9]?[0-9]?,)?[0-9]+(\.[0-9][0-9])?/;
  const RATING_REG_EXP = /([0-9]\.[0-9][0-9]?.?[0-9])\sout/;
  const DELIVERY_DAY_REG_EXP =
    /(delivery\s(Tomorrow|Mon|Tue|Wed|Thr|Fri|Sat|Sun),\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).([0-9]?[0-9]))/;
  const CLEAN_UP_PRICES_REGEXP = /[\.\$,]/g;
  const CLEAN_UP_RATING_REGEXP = /[\.]/g;

  type Card = { content: string | undefined; url: URL | undefined | null };

  const cleanupProductCards = (productsCards: Element[]) => {
    if (!productsCards || productsCards.length === 0) {
      return [];
    }

    return productsCards.map((element) => {
      const colRightElement = element?.querySelector(".s-card-container");
      const card: Card = {} as Card;

      if (colRightElement instanceof Element) {
        card.content = colRightElement.textContent
          ?.replace(/(\r\n|\n|\r)/gm, "")
          .trim();

        const href = colRightElement?.querySelector("a")?.getAttribute("href");
        const { origin } = window.location;
        card.url = new URL(href!, origin);

        return card;
      }

      return;
    });
  };

  interface Props {
    price: number;
    rating: number;
    delivery: number;
    url: string;
    score?: number;
  }
  const extractProps = (productsCardsContent: Card[]) => {
    if (!productsCardsContent || productsCardsContent.length === 0) {
      return [];
    }

    return productsCardsContent.map((card) => {
      const priceMatch = card?.content?.match(PRICE_REGEXP);
      const ratingMatch = card?.content?.match(RATING_REG_EXP);
      const deliveryMatch = card?.content?.match(DELIVERY_DAY_REG_EXP);
      const url = card?.url?.toString();

      if (priceMatch && ratingMatch && deliveryMatch && url) {
        const date = new Date(`${deliveryMatch[3]}, ${deliveryMatch[4]}, 2023`);
        const deliveryMonth = date.getMonth();
        const deliveryDay = date.getDate().toString().padStart(2, "0");
        const delivery =
          deliveryMonth && deliveryDay
            ? Number(`${deliveryMonth}${deliveryDay}`)
            : Infinity;

        return {
          price: Number(priceMatch[0].replace(CLEAN_UP_PRICES_REGEXP, "")),
          rating: Number(
            (ratingMatch[1] ?? "")
              .replace(CLEAN_UP_RATING_REGEXP, "")
              .substring(0, 2)
          ),
          url: url,
          delivery,
        } as Props;
      }

      return;
    });
  };

  type RankParams = Props[];
  const rank = (products: RankParams) => {
    if (!products || products.length === 0) {
      return [];
    }

    const oneThird = 1 / 3;
    const PRICE_WEIGHT = oneThird;
    const RATING_WEIGHT = oneThird;
    const DELIVERY_WEIGHT = oneThird;

    const minPrice = Math.min(...products.map((product) => product.price));
    const minDelivery = Math.min(
      ...products.map((product) => product.delivery)
    );
    const maxRating = 5;

    const productsWithScore = products.map((product) => {
      const priceScore = (minPrice - product.price) / minPrice;
      const ratingScore = product.rating / maxRating;
      const deliveryScore = (minDelivery - product.delivery) / minDelivery;

      product.score =
        PRICE_WEIGHT * priceScore +
        RATING_WEIGHT * ratingScore +
        DELIVERY_WEIGHT * deliveryScore;

      return product;
    });

    return productsWithScore.sort(
      (a, b) =>
        (b as unknown as { score: number }).score -
        (a as unknown as { score: number }).score
    );
  };

  const allProductsCardsEls = document.querySelectorAll(
    '[data-component-type="s-search-result"]'
  );

  const getBestRates = (
    productsCardsElements: NodeListOf<Element>,
    debug: boolean
  ) => {
    const productsCardsElementsContent = cleanupProductCards(
      Array.from(productsCardsElements)
    );

    const props = extractProps(
      productsCardsElementsContent.filter(Boolean) as Card[]
    );

    const ranked = rank(props.filter(Boolean) as Props[]);

    if (debug) console.table(ranked); // All products

    return ranked[0];
  };

  const result = getBestRates(allProductsCardsEls, true);

  console.log("Best ranked:", result);
  console.log("URL:", result?.url);
})();

/**
 * Example URLs:
 * https://www.amazon.com/s?k=headphones&crid=VS7GDL0WY0ZR&sprefix=headphones%2Caps%2C522&ref=nb_sb_noss_2
 * https://www.amazon.com/s?k=turntables&sprefix=Turtables%2Caps%2C153&ref=nb_sb_ss_sc_1_10
 * https://www.amazon.com/s?k=ipod&crid=1H1OUBQJE09GV&sprefix=iPod%2Caps%2C156&ref=nb_sb_ss_ts-doa-p_1_4
 * https://www.amazon.com/s?k=tv&crid=3MNQFKABBESMW&sprefix=TV%2Caps%2C157&ref=nb_sb_ss_ts-doa-p_1_2
 * https://www.amazon.com/s?k=laptop&sprefix=lap%2Caps%2C149&ref=nb_sb_ss_ts-doa-p_1_3
 */

/**
 * Core algorithm use here is "Weighted ranking".
 *
 * After parse and extract prices, ratings, and delivery times,
 * these 3 properties get normalize to an array of
 * { price: number, rating: number, delivery: number, url: string }
 *
 * Then each of these objects is processed and assign an score.
 * Score is calculated as following:
 * (3.333 * price) + (3.333 * rating) + (3.333 * delivery)
 *
 * Later this array is sorted descending by score
 * which will result on having the first item as the best ranked.
 * */
