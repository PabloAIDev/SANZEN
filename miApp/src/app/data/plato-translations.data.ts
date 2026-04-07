export interface PlatoEnglishTranslation {
  name: string;
  description: string;
  units: string;
  ingredients: string[];
  sideDishes?: string[];
}

export const ENGLISH_PLATO_TRANSLATIONS: Record<number, PlatoEnglishTranslation> = {
  1: {
    name: 'Nem Rolls',
    description: 'Crispy Vietnamese rolls filled with pork, prawns and vegetables, wrapped in rice paper and served with lettuce and soy sauce.',
    units: '4 rolls',
    ingredients: [
      'Minced pork (60 g)',
      'Carrot (25 g)',
      'Prawns (15 g)',
      'Rice paper (4 sheets)',
      'Fish sauce (1/2 tsp)',
      'Egg (1/4 unit)',
      'Garlic (1/4 clove)',
      'Sunflower oil (for frying)',
      'Salt',
      'Black pepper'
    ],
    sideDishes: [
      'Lettuce leaves (15 g)',
      'Light soy sauce (5 ml)'
    ]
  },
  2: {
    name: 'Pork and Vegetable Gyozas',
    description: 'Steamed or pan-fried gyozas filled with pork and vegetables, seasoned with garlic, ginger and sauces.',
    units: '5 gyozas',
    ingredients: [
      'Minced pork (50 g)',
      'Chinese cabbage (25 g)',
      'Gyoza wrappers (5 units)',
      'Garlic (1/2 clove)',
      'Carrot (15 g)',
      'Ginger (small piece)',
      'Soy sauce (1/2 tbsp)',
      'Sesame oil (1/4 tsp)',
      'Sunflower oil (for frying)'
    ]
  },
  3: {
    name: 'Pork Ssam',
    description: 'Marinated and roasted pork shoulder served with iceberg lettuce leaves, bean sprouts and grated cucumber.',
    units: '2 wraps',
    ingredients: [
      'Boneless pork shoulder (125 g)',
      'White sugar (1/4 tbsp)',
      'Brown sugar (1/4 tbsp)',
      'Herbes de Provence',
      'Salt',
      'Spring onion (1/8 unit)',
      'Ginger (small piece)',
      'Rice vinegar (1/16 tsp)',
      'Extra virgin olive oil (1/2 tbsp)'
    ],
    sideDishes: [
      'Iceberg lettuce leaves (2)',
      'Bean sprouts',
      'Grated cucumber (10 g)'
    ]
  },
  4: {
    name: 'Spinach and Tofu Triangles',
    description: 'Crispy filo pastry triangles filled with tofu and spinach, finished with sesame seeds.',
    units: '2 triangles',
    ingredients: [
      'Filo pastry (1/4 pack)',
      'Sesame seeds (1 tsp)',
      'Olive oil (1 tsp)',
      'Flaked salt',
      'Tofu (250 g)',
      'Frozen spinach (250 g)',
      'Lemon (1 unit)',
      'Garlic powder (1/4 tbsp)',
      'Dried dill (1/4 tbsp)',
      'Dijon mustard (1/8 tbsp)',
      'Nutmeg (1/4 tsp)'
    ]
  },
  5: {
    name: 'Aubergines with Cucumber and Yogurt Sauce',
    description: 'Roasted aubergines with cucumber and yogurt sauce, seasoned with spices and coriander.',
    units: '1 dish',
    ingredients: [
      'Aubergines (75 g)',
      'Mustard seeds (1/4 tsp)',
      'Cumin (1/4 tsp)',
      'Chilli (optional, 1/8 unit)',
      'Olive oil (1 tsp)',
      'Salt and pepper',
      'Plain yogurt (120 g)',
      'Cucumber (1/4 unit)',
      'Coriander (2-3 leaves)',
      'Cayenne pepper (pinch)',
      'Paprika (pinch)'
    ]
  },
  6: {
    name: 'Fried Pumpkin with Mango Chutney',
    description: 'Spiced fried pumpkin served with sweet and slightly spicy mango chutney.',
    units: '1 dish',
    ingredients: [
      'Pumpkin (125 g)',
      'Chickpea flour (25 g)',
      'Turmeric (1/4 tsp)',
      'Ground cumin (1/4 tsp)',
      'Sunflower oil',
      'Salt',
      'Ripe mango (1/4 unit)',
      'Red onion (1/4 unit)',
      'Apple cider vinegar (12 ml)',
      'Brown sugar (12 g)',
      'Ginger (small piece)',
      'Chilli (pinch)'
    ]
  },
  7: {
    name: 'Indian Fritters',
    description: 'Vegetable fritters coated in chickpea flour and spices, fried until golden.',
    units: '1 dish',
    ingredients: [
      'Chickpea flour (50 g)',
      'Courgette (50 g)',
      'Carrot (50 g)',
      'Onion (25 g)',
      'Curry powder (1/4 tsp)',
      'Baking powder (1/4 tsp)',
      'Cold water (30 ml)',
      'Sunflower oil',
      'Salt'
    ]
  },
  8: {
    name: 'Coconut Rice',
    description: 'Rice cooked with coconut milk and egg, served with spicy tamarind sauce and vegetables.',
    units: '1 dish',
    ingredients: [
      'Rice (100 g)',
      'Coconut milk (100 ml)',
      'Egg (1/2 unit)',
      'Cucumber (1/8 unit)',
      'Water (50 ml)',
      'Roasted peanuts (10 g)',
      'Shallot (1/4 unit)',
      'Garlic (1/2 clove)',
      'Cayenne pepper (pinch)',
      'Tamarind (1/2 tbsp)',
      'Sugar (1/2 tsp)',
      'Olive oil (1 tsp)'
    ]
  },
  9: {
    name: 'Ramen',
    description: 'Japanese ramen with noodles, broth, egg, pork belly and vegetables, flavoured with ginger and nori seaweed.',
    units: '1 bowl',
    ingredients: [
      'Ramen noodles (1 pack / 80 g)',
      'Chicken or vegetable broth (500 ml)',
      'Egg (1 unit)',
      'Pork belly (50 g)',
      'Soy sauce (1 tbsp)',
      'Ginger (small piece)',
      'Garlic (1 clove)',
      'Chives (1/4 bunch)',
      'Nori seaweed (1 sheet)'
    ]
  },
  10: {
    name: 'Bibimbap',
    description: 'Korean rice bowl with vegetables, meat, egg and Gochujang sauce.',
    units: '1 bowl',
    ingredients: [
      'Short-grain rice (100 g)',
      'Minced beef (50 g)',
      'Carrot (25 g)',
      'Spinach (50 g)',
      'Bean sprouts (25 g)',
      'Shiitake mushrooms (2 units)',
      'Cucumber (1/4 unit)',
      'Egg (1 unit)',
      'Sesame oil (1/2 tsp)',
      'Sesame seeds (1/2 tsp)',
      'Gochujang sauce (1 tsp)'
    ]
  },
  11: {
    name: 'Teriyaki Chicken with Shiitake Mushrooms and Rice',
    description: 'Stir-fried chicken with shiitake mushrooms, rice and carrot, finished with teriyaki sauce and sesame seeds.',
    units: '1 dish',
    ingredients: [
      'Chicken breast (100 g)',
      'Shiitake mushrooms (50 g)',
      'Round rice (50 g)',
      'Water (50 ml)',
      'Carrot (25 g)',
      'Courgette (1/8 unit)',
      'Ground almonds (1/4 tbsp)',
      'Teriyaki sauce (1/2 tbsp)',
      'Sesame seeds (1/2 tsp)',
      'Olive oil (1 tsp)'
    ]
  },
  12: {
    name: 'Vegan Nasi Goreng',
    description: 'Indonesian-style fried rice with vegetables, seasoned with soy sauce and spices.',
    units: '1 dish',
    ingredients: [
      'Rice (100 g)',
      'Carrot (25 g)',
      'Cabbage (50 g)',
      'Spring onion (1/4 unit)',
      'Garlic (1 clove)',
      'Soy sauce (1 tbsp)',
      'Sunflower oil (1 tsp)',
      'Hot sauce (optional)',
      'Salt'
    ]
  },
  13: {
    name: 'Red Vegetable Curry',
    description: 'Thai vegetable curry with coconut milk and red curry paste, balanced with sugar and fish sauce.',
    units: '1 dish',
    ingredients: [
      'Courgette (25 g)',
      'Carrot (50 g)',
      'Red pepper (25 g)',
      'Green beans (25 g)',
      'Coconut milk (100 ml)',
      'Red curry paste (1/2 tbsp)',
      'Brown sugar (1/2 tbsp)',
      'Fish sauce (1/2 tsp)',
      'Olive oil (1 tsp)'
    ]
  },
  14: {
    name: 'Miso Soup',
    description: 'Japanese miso soup with tofu and seaweed, finished with spring onion.',
    units: '1 bowl',
    ingredients: [
      'Water (250 ml)',
      'Red or white miso paste (1 tbsp)',
      'Firm tofu (50 g)',
      'Nori or wakame seaweed (1 sheet)',
      'Spring onion, green part only (1/2 unit)'
    ]
  },
  15: {
    name: 'Noodles with Peanut Sauce',
    description: 'Wheat noodles with creamy peanut sauce, served with cucumber and sesame seeds.',
    units: '1 dish',
    ingredients: [
      'Wheat noodles (100 g)',
      'Peanut butter (1 1/2 tbsp)',
      'Soy sauce (1 tbsp)',
      'Honey (1/2 tbsp)',
      'Balsamic vinegar (1/2 tbsp)',
      'Sesame oil (1/2 tbsp)',
      'Chilli oil (optional, 1/4 tsp)',
      'Cucumber (1/4 unit)',
      'Sesame seeds (1 tsp)',
      'Garlic powder (1/4 tsp)'
    ]
  },
  16: {
    name: 'Vegetable Tempura',
    description: 'Japanese-style battered vegetables fried in a light and crispy tempura coating.',
    units: '1 dish',
    ingredients: [
      'Carrot (25 g)',
      'Courgette (25 g)',
      'Aubergine (25 g)',
      'Flour (50 g)',
      'Very cold water (50 ml)',
      'Sunflower oil (for frying)',
      'Salt'
    ]
  },
  17: {
    name: 'Bami Goreng',
    description: 'Indonesian-style stir-fried noodles with chicken, prawns, carrot and cabbage, flavoured with Ketjap Manis.',
    units: '1 dish',
    ingredients: [
      'Egg noodles (125 g)',
      'Chicken breast (100 g)',
      'Prawns (50 g)',
      'Carrot (25 g)',
      'Cabbage (50 g)',
      'Garlic (1 clove)',
      'Sweet soy sauce Ketjap Manis (1 1/2 tbsp)',
      'Sunflower oil (1 tsp)'
    ]
  },
  18: {
    name: 'Bulgogi',
    description: 'Korean-style marinated beef, stir-fried with spring onion and garlic, finished with soy sauce and sesame seeds.',
    units: '1 dish',
    ingredients: [
      'Beef top round (250 g)',
      'Spring onion (1/2 unit)',
      'Garlic (1/2 clove)',
      'Soy sauce (1 1/2 tbsp)',
      'Sesame oil (1 tbsp)',
      'Sugar (1/2 tbsp)',
      'Black pepper (pinch)',
      'Sesame seeds (1/2 tsp)'
    ]
  },
  19: {
    name: 'Katsudon',
    description: 'Japanese rice bowl with breaded pork cutlet, egg and sauce, served as a complete meal.',
    units: '1 dish',
    ingredients: [
      'Rice (210 g)',
      'Pork chops (150 g)',
      'Panko breadcrumbs (45 g)',
      'Flour (30 g)',
      'Egg (1 unit)',
      'Olive oil (1 tsp)',
      'Vegetable broth (60 ml)',
      'Onion (1/8 unit)',
      'Soy sauce (1 tbsp)',
      'Sugar (1/2 tsp)',
      'Salt and pepper'
    ]
  },
  20: {
    name: 'Butter Chicken',
    description: 'Indian-style chicken in a creamy tomato and spice sauce with butter and garam masala.',
    units: '1 dish',
    ingredients: [
      'Chicken breast (125 g)',
      'Onion (1/4 unit)',
      'Garlic (1 clove)',
      'Ginger (small piece)',
      'Crushed tomato (50 ml)',
      'Cooking cream (25 ml)',
      'Butter (12 g)',
      'Garam masala (1/4 tbsp)',
      'Turmeric (1/4 tsp)',
      'Olive oil (1 tsp)'
    ]
  },
  21: {
    name: 'Mango Sticky Rice',
    description: 'Glutinous rice cooked with coconut milk, sugar and fresh mango, sweet and fragrant.',
    units: '1 dish',
    ingredients: [
      'Glutinous rice (50 g)',
      'Coconut milk (62 ml)',
      'Sugar (3/4 tbsp)',
      'Salt (pinch)',
      'Ripe mango (1/4 unit)'
    ]
  },
  22: {
    name: 'Mochi',
    description: 'Japanese sweet made with glutinous rice flour and filled with anko or ice cream.',
    units: '2 mochi',
    ingredients: [
      'Glutinous rice flour (75 g)',
      'Sugar (50 g)',
      'Water (100 ml)',
      'Cornstarch (1 tsp)',
      'Filling of choice: red bean paste or ice cream (30 g)'
    ]
  },
  23: {
    name: 'Korean Pancake',
    description: 'Korean hotteok pancake filled with brown sugar, cinnamon and walnuts.',
    units: '1 pancake',
    ingredients: [
      'Wheat flour (125 g)',
      'Dry yeast (1/2 tsp)',
      'Warm water (75 ml)',
      'Sugar (1/2 tbsp)',
      'Salt (pinch)',
      'Brown sugar (12 g)',
      'Cinnamon (1/2 tsp)',
      'Chopped walnuts (10 g)'
    ]
  },
  24: {
    name: 'White Chocolate and Matcha Cake',
    description: 'Soft white chocolate cake with a touch of matcha tea, fluffy and sweet.',
    units: '1 slice',
    ingredients: [
      'White chocolate (50 g)',
      'Cream (25 ml)',
      'Eggs (1 unit)',
      'Sugar (12 g)',
      'Flour (20 g)',
      'Matcha tea powder (1/2 tbsp)',
      'Butter for the tin (5 g)'
    ]
  }
};
