import { PROTEINS, FRY_SIDES, Order, Ingredient, BREADED_TO_COOK } from "@/game/GameContext";

export const ingredientProducts = (ing: Ingredient): Set<string> => {
  const products = new Set<string>();
  Object.entries(ing.direct).forEach(([station, target]) => {
    if (station === "bread") {
      const cooked = BREADED_TO_COOK[target];
      if (cooked) products.add(cooked);
    } else {
      products.add(target);
    }
  });
  return products;
};

export const ingredientDemand = (ingId: string, orders: Order[]): number => {
  const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === ingId);
  if (!ing) return 0;
  const products = ingredientProducts(ing);
  let count = 0;
  orders.forEach((o: Order) => {
    o.items.forEach(it => {
      if (it.fulfilled) return;
      if (it.kind === "cook" && it.product && products.has(it.product)) count++;
      else if (it.kind === "cook_choice" && it.products?.some(p => products.has(p))) count++;
    });
  });
  return count;
};

export const instantDemand = (id: string, orders: Order[]): number => {
  let count = 0;
  orders.forEach((o: Order) => {
    o.items.forEach(it => {
      if (it.fulfilled) return;
      if ((it.kind === "side" || it.kind === "cold") && it.product === id) count++;
    });
  });
  return count;
};
