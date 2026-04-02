export interface Macronutrients {
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Nutrition {
  macronutrients: Macronutrients;
}

export type CategoriaPlato = 'Entrante' | 'Principal' | 'Postre';

export interface Plato {
  id: number;
  name: string;
  description: string;
  servings: number;
  units: string;
  ingredients: string[];
  allergens: string[];
  side_dishes: string[];
  category: CategoriaPlato;
  calories: number;
  price: number;
  nutrition: Nutrition;
  healthScore: number;
  available: boolean;
  image: string;
}
