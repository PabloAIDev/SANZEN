import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {Macronutrients, Plato} from '../models/plato.model';

interface PlatoApiResponse {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: Plato['category'];
  calorias: number;
  precio: number;
  healthScore: number;
  imagen: string;
  disponible: boolean;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
  allergens: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PlatoService {
  private readonly apiUrl = 'http://localhost:3000/api/platos';

  private platos: Plato[] = [
    {
      id: 1,
      name: 'Rollitos Nem',
      description: 'Rollitos vietnamitas fritos rellenos de carne de cerdo, gambas y verduras, envueltos en papel de arroz y acompañados de lechuga y salsa de soja.',
      servings: 1,
      units: '4 rollitos',
      ingredients: [
        'Carne de cerdo picada (60 g)',
        'Zanahoria (25 g)',
        'Gambas (15 g)',
        'Papel de arroz (4 obleas)',
        'Salsa de pescado (1/2 cucharadita)',
        'Huevo (1/4 unidad)',
        'Ajo (1/4 diente)',
        'Aceite de girasol (para freír)',
        'Sal',
        'Pimienta negra'
      ],
      allergens: ['Crustáceos', 'Huevo', 'Soja', 'Pescado'],
      side_dishes: [
        'Hojas de lechuga (15 g)',
        'Salsa de soja suave (5 ml)'
      ],
      category: 'Entrante',
      calories: 320,
      price: 6.5,
      nutrition: {
        macronutrients: {
          protein_g: 18,
          carbohydrates_g: 25,
          fat_g: 14,
          fiber_g: 2
        }
      },
      healthScore: 7.8,
      available: true,
      image: 'assets/img/rollitosnem.jpg'
    },
    {
      "id": 2,
      "name": "Gyozas de cerdo y verduras",
      "description": "Gyozas al vapor o fritas rellenas de cerdo y verduras, aromatizadas con ajo, jengibre y salsas.",
      "servings": 1,
      "units": "5 gyozas",
      "ingredients": [
        "Carne picada de cerdo (50 g)",
        "Col china (25 g)",
        "Obleas para gyoza (5 unidades)",
        "Ajo (1/2 diente)",
        "Zanahoria (15 g)",
        "Jengibre (pequeño trozo)",
        "Salsa de soja (1/2 cucharada)",
        "Aceite de sésamo (1/4 cucharadita)",
        "Aceite de girasol (para freír)"
      ],
      "allergens": ["Gluten", "Crustáceos", "Soja"],
      "side_dishes": [],
      "category": "Entrante",
      "calories": 220,
      "price": 6,
      "nutrition": {
        "macronutrients": {"protein_g": 12, "carbohydrates_g": 20, "fat_g": 10, "fiber_g": 2}
      },
      "healthScore": 7.7,
      "available": true,
      image: 'assets/img/gyozas.jpg'
    },
    {
      "id": 3,
      "name": "Ssam de cerdo",
      "description": "Paletilla de cerdo marinada y asada, acompañada de hojas de lechuga iceberg, brotes de soja y pepino rallado.",
      "servings": 1,
      "units": "2 rollitos",
      "ingredients": [
        "Paletilla de cerdo deshuesada (125 g)",
        "Azúcar blanca (1/4 cucharada)",
        "Azúcar moreno (1/4 cucharada)",
        "Hierbas provenzales",
        "Sal",
        "Cebolleta (1/8 unidad)",
        "Jengibre (pequeña punta)",
        "Vinagre de arroz (1/16 cucharadita)",
        "Aceite de oliva virgen extra (1/2 cucharada)"
      ],
      "allergens": ["Soja"],
      "side_dishes": ["Hojas de lechuga iceberg (2)", "Brotes de soja", "Pepino rallado (10 g)"],
      "category": "Entrante",
      "calories": 380,
      "price": 7,
      "nutrition": {
        "macronutrients": {"protein_g": 22, "carbohydrates_g": 8, "fat_g": 25, "fiber_g": 1.5}
      },
      "healthScore": 7.0,
      "available": true,
      image: 'assets/img/ssam.jpg'
    },
    {
      "id": 4,
      "name": "Triángulos de espinacas y tofu",
      "description": "Triángulos fritos de masa filo rellenos de tofu y espinacas con especias, acompañados de semillas de sésamo.",
      "servings": 1,
      "units": "2 triángulos",
      "ingredients": [
        "Masa filo (1/4 paquete)",
        "Semillas de sésamo (1 cucharadita)",
        "Aceite de oliva (1 cucharadita)",
        "Sal en escamas",
        "Tofu (250 g)",
        "Espinacas congeladas (250 g)",
        "Limón (1)",
        "Ajo en polvo (1/4 cucharada)",
        "Eneldo seco (1/4 cucharada)",
        "Mostaza de Dijon (1/8 cucharada)",
        "Nuez moscada (1/4 cucharadita)"
      ],
      "allergens": ["Gluten", "Sésamo", "Soja"],
      "side_dishes": [],
      "category": "Entrante",
      "calories": 300,
      "price": 6,
      "nutrition": {
        "macronutrients": {"protein_g": 14, "carbohydrates_g": 28, "fat_g": 16, "fiber_g": 5}
      },
      "healthScore": 8.0,
      "available": true,
      image: 'assets/img/triangulos.jpg'
    },
    {
      "id": 5,
      "name": "Berenjenas con salsa de pepino y yogur",
      "description": "Berenjenas asadas con salsa de pepino y yogur, aromatizadas con especias y cilantro.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Berenjenas (75 g)",
        "Granos de mostaza (1/4 cucharadita)",
        "Comino (1/4 cucharadita)",
        "Guindilla (opcional, 1/8 unidad)",
        "Aceite de oliva (1 cucharadita)",
        "Sal y pimienta",
        "Yogur natural (120 g)",
        "Pepino (1/4 unidad)",
        "Cilantro (2-3 hojas)",
        "Cayena (pizca)",
        "Pimentón (pizca)"
      ],
      "allergens": ["Lácteos"],
      "side_dishes": [],
      "category": "Entrante",
      "calories": 210,
      "price": 5.5,
      "nutrition": {
        "macronutrients": {"protein_g": 5, "carbohydrates_g": 18, "fat_g": 12, "fiber_g": 4}
      },
      "healthScore": 8.2,
      "available": true,
      image: 'assets/img/berenjena.jpg'
    },
    {
      "id": 6,
      "name": "Calabaza frita con chutney de mango",
      "description": "Calabaza frita especiada acompañada de chutney de mango dulce y ligeramente picante.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Calabaza (125 g)",
        "Harina de garbanzos (25 g)",
        "Cúrcuma (1/4 cucharadita)",
        "Comino en polvo (1/4 cucharadita)",
        "Aceite de girasol",
        "Sal",
        "Mango maduro (1/4 unidad)",
        "Cebolla morada (1/4 unidad)",
        "Vinagre de manzana (12 ml)",
        "Azúcar moreno (12 g)",
        "Jengibre (pequeño trozo)",
        "Chile (pizca)"
      ],
      "allergens": [],
      "side_dishes": [],
      "category": "Entrante",
      "calories": 250,
      "price": 5.5,
      "nutrition": {
        "macronutrients": {"protein_g": 3, "carbohydrates_g": 40, "fat_g": 10, "fiber_g": 4}
      },
      "healthScore": 7.5,
      "available": true,
      image: 'assets/img/calabaza.jpg'
    },
    {
      "id": 7,
      "name": "Frituras indias",
      "description": "Verduras rebozadas con harina de garbanzos y especias, fritas hasta dorar.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Harina de garbanzos (50 g)",
        "Calabacín (50 g)",
        "Zanahoria (50 g)",
        "Cebolla (25 g)",
        "Curry (1/4 cucharadita)",
        "Levadura química (1/4 cucharadita)",
        "Agua fría (30 ml)",
        "Aceite de girasol",
        "Sal"
      ],
      "allergens": ["Legumbres"],
      "side_dishes": [],
      "category": "Entrante",
      "calories": 210,
      "price": 5.5,
      "nutrition": {
        "macronutrients": {"protein_g": 6, "carbohydrates_g": 28, "fat_g": 12, "fiber_g": 4}
      },
      "healthScore": 7.6,
      "available": true,
      image: 'assets/img/frituras.jpg'
    },
    {
      "id": 8,
      "name": "Arroz con coco",
      "description": "Arroz cocido con leche de coco y huevo, acompañado de salsa picante de tamarindo y verduras.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Arroz (100 g)",
        "Leche de coco (100 ml)",
        "Huevo (1/2 unidad)",
        "Pepino (1/8 unidad)",
        "Agua (50 ml)",
        "Cacahuetes tostados (10 g)",
        "Chalota (1/4 unidad)",
        "Ajo (1/2 diente)",
        "Cayena (pizca)",
        "Tamarindo (1/2 cucharada)",
        "Azúcar (1/2 cucharadita)",
        "Aceite de oliva (1 cucharadita)"
      ],
      "allergens": ["Huevo", "Frutos secos", "Lácteos"],
      "side_dishes": [],
      "category": "Entrante",
      "calories": 300,
      "price": 5.5,
      "nutrition": {
        "macronutrients": {"protein_g": 8, "carbohydrates_g": 45, "fat_g": 10, "fiber_g": 3}
      },
      "healthScore": 7.8,
      "available": true,
      image: 'assets/img/arroz.jpg'
    },
    {
      "id": 9,
      "name": "Ramen",
      "description": "Ramen japonés con fideos, caldo, huevo, panceta y verduras aromatizadas con jengibre y alga nori.",
      "servings": 1,
      "units": "1 bol",
      "ingredients": [
        "Fideos para ramen (1 paquete / 80 g)",
        "Caldo de pollo o verduras (500 ml)",
        "Huevo (1 unidad)",
        "Panceta de cerdo (50 g)",
        "Salsa de soja (1 cucharada)",
        "Jengibre (pequeño trozo)",
        "Ajo (1 diente)",
        "Cebollino (1/4 manojo)",
        "Alga nori (1 hoja)"
      ],
      "allergens": ["Gluten", "Huevo", "Soja"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 380,
      "price": 7,
      "nutrition": {
        "macronutrients": {"protein_g": 18, "carbohydrates_g": 45, "fat_g": 12, "fiber_g": 3}
      },
      "healthScore": 7.9,
      "available": true,
      image: 'assets/img/ramen.jpg'
    },
    {
      "id": 10,
      "name": "Bibimbap",
      "description": "Plato coreano de arroz con verduras, carne, huevo y salsa Gochujang.",
      "servings": 1,
      "units": "1 bol",
      "ingredients": [
        "Arroz de grano corto (100 g)",
        "Carne de ternera picada (50 g)",
        "Zanahoria (25 g)",
        "Espinacas (50 g)",
        "Brotes de soja (25 g)",
        "Setas shiitake (2 unidades)",
        "Pepino (1/4 unidad)",
        "Huevo (1 unidad)",
        "Aceite de sésamo (1/2 cucharadita)",
        "Semillas de sésamo (1/2 cucharadita)",
        "Salsa Gochujang (1 cucharadita)"
      ],
      "allergens": ["Huevo", "Soja", "Gluten"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 420,
      "price": 7,
      "nutrition": {
        "macronutrients": {"protein_g": 22, "carbohydrates_g": 55, "fat_g": 14, "fiber_g": 5}
      },
      "healthScore": 7.8,
      "available": true,
      image: 'assets/img/bibimbap.jpg'
    },
    {
      "id": 11,
      "name": "Pollo teriyaki con setas shiitake y arroz",
      "description": "Pollo salteado con setas shiitake, arroz y zanahoria, aromatizado con salsa teriyaki y semillas de sésamo.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Pechuga de pollo (100 g)",
        "Setas shiitake (50 g)",
        "Arroz redondo (50 g)",
        "Agua (50 ml)",
        "Zanahoria (25 g)",
        "Calabacín (1/8 unidad)",
        "Almendras molidas (1/4 cucharada)",
        "Salsa teriyaki (1/2 cucharada)",
        "Semillas de sésamo (1/2 cucharadita)",
        "Aceite de oliva (1 cucharadita)"
      ],
      "allergens": ["Soja", "Sésamo", "Frutos secos"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 420,
      "price": 7.5,
      "nutrition": {
        "macronutrients": {"protein_g": 30, "carbohydrates_g": 40, "fat_g": 15, "fiber_g": 3}
      },
      "healthScore": 7.9,
      "available": true,
      image: 'assets/img/polloteriyaki.jpg'
    },
    {
      "id": 12,
      "name": "Nasi Goreng vegano",
      "description": "Arroz frito al estilo indonesio con verduras, aromatizado con salsa de soja y especias.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Arroz (100 g)",
        "Zanahoria (25 g)",
        "Col (50 g)",
        "Cebolleta (1/4 unidad)",
        "Ajo (1 diente)",
        "Salsa de soja (1 cucharada)",
        "Aceite de girasol (1 cucharadita)",
        "Salsa picante (opcional)",
        "Sal"
      ],
      "allergens": ["Soja","Gluten"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 300,
      "price": 6,
      "nutrition": {
        "macronutrients": {
          "protein_g": 7,
          "carbohydrates_g": 50,
          "fat_g": 8,
          "fiber_g": 4
        }
      },
      "healthScore": 8.1,
      "available": true,
      image: 'assets/img/nasigoreng.jpg'
    },
    {
      "id": 13,
      "name": "Curry rojo de verduras",
      "description": "Curry tailandés de verduras con leche de coco y pasta de curry rojo, aromatizado con azúcar y salsa de pescado.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Calabacín (25 g)",
        "Zanahoria (50 g)",
        "Pimiento rojo (25 g)",
        "Judías verdes (25 g)",
        "Leche de coco (100 ml)",
        "Pasta de curry rojo (1/2 cucharada)",
        "Azúcar moreno (1/2 cucharada)",
        "Salsa de pescado (1/2 cucharadita)",
        "Aceite de oliva (1 cucharadita)"
      ],
      "allergens": ["Lácteos", "Pescado"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 250,
      "price": 6,
      "nutrition": {
        "macronutrients": {"protein_g": 6, "carbohydrates_g": 20, "fat_g": 15, "fiber_g": 5}
      },
      "healthScore": 8.0,
      "available": true,
      image: 'assets/img/curry.jpg'
    },
    {
      "id": 14,
      "name": "Sopa de miso",
      "description": "Sopa japonesa de miso con tofu y algas, aromatizada con cebolleta.",
      "servings": 1,
      "units": "1 bol",
      "ingredients": [
        "Agua (250 ml)",
        "Pasta de miso rojo o blanco (1 cucharada)",
        "Tofu firme (50 g)",
        "Alga nori o wakame (1 hoja)",
        "Cebolleta (solo verde, 1/2 unidad)"
      ],
      "allergens": ["Soja", "Lácteos"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 120,
      "price": 4.5,
      "nutrition": {
        "macronutrients": {"protein_g": 6, "carbohydrates_g": 8, "fat_g": 4, "fiber_g": 1}
      },
      "healthScore": 8.5,
      "available": true,
      image: 'assets/img/sopa.jpg'
    },
    {
      "id": 15,
      "name": "Noodles con salsa de cacahuete",
      "description": "Noodles de trigo con cremosa salsa de cacahuete, acompañados de pepino y semillas de sésamo.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Fideos de trigo (100 g)",
        "Crema de cacahuete (1 1/2 cucharadas)",
        "Salsa de soja (1 cucharada)",
        "Miel (1/2 cucharada)",
        "Vinagre de Módena (1/2 cucharada)",
        "Aceite de sésamo (1/2 cucharada)",
        "Aceite de chile (opcional, 1/4 cucharadita)",
        "Pepino (1/4 unidad)",
        "Semillas de sésamo (1 cucharadita)",
        "Ajo en polvo (1/4 cucharadita)"
      ],
      "allergens": ["Gluten", "Frutos secos", "Soja"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 400,
      "price": 6.5,
      "nutrition": {
        "macronutrients": {"protein_g": 10, "carbohydrates_g": 50, "fat_g": 18, "fiber_g": 4}
      },
      "healthScore": 7.6,
      "available": true,
      image: 'assets/img/noodles.jpg'
    },
    {
      "id": 16,
      "name": "Tempura de verduras",
      "description": "Verduras rebozadas al estilo japonés, fritas en tempura ligera y crujiente.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Zanahoria (25 g)",
        "Calabacín (25 g)",
        "Berenjena (25 g)",
        "Harina (50 g)",
        "Agua muy fría (50 ml)",
        "Aceite de girasol (para freír)",
        "Sal"
      ],
      "allergens": ["Gluten"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 280,
      "price": 5.5,
      "nutrition": {
        "macronutrients": {
          "protein_g": 5,
          "carbohydrates_g": 35,
          "fat_g": 12,
          "fiber_g": 3
        }
      },
      "healthScore": 7.9,
      "available": true,
      image: 'assets/img/tempura.jpg'
    },
    {
      "id": 17,
      "name": "Bami Goreng",
      "description": "Fideos salteados al estilo indonesio con pollo, gambas, zanahoria y col, aromatizados con salsa Ketjap Manis.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Fideos de huevo (125 g)",
        "Pechuga de pollo (100 g)",
        "Gambas (50 g)",
        "Zanahoria (25 g)",
        "Col (50 g)",
        "Ajo (1 diente)",
        "Salsa de soja dulce Ketjap Manis (1 1/2 cucharadas)",
        "Aceite de girasol (1 cucharadita)"
      ],
      "allergens": ["Gluten", "Crustáceos", "Huevo", "Soja"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 450,
      "price": 7,
      "nutrition": {
        "macronutrients": {"protein_g": 28, "carbohydrates_g": 55, "fat_g": 15, "fiber_g": 4}
      },
      "healthScore": 7.5,
      "available": true,
      image: 'assets/img/bamigoreng.jpg'
    },
    {
      "id": 18,
      "name": "Bulgogi",
      "description": "Carne de ternera marinada estilo coreano, salteada con cebolleta y ajo, aromatizada con salsa de soja y semillas de sésamo.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Ternera contra (250 g)",
        "Cebolleta (1/2 unidad)",
        "Ajo (1/2 diente)",
        "Salsa de soja (1 1/2 cucharadas)",
        "Aceite de sésamo (1 cucharada)",
        "Azúcar (1/2 cucharada)",
        "Pimienta negra (pizca)",
        "Semillas de sésamo (1/2 cucharadita)"
      ],
      "allergens": ["Soja","Sésamo"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 450,
      "price": 7,
      "nutrition": {
        "macronutrients":{"protein_g":35,"carbohydrates_g":5,"fat_g":30,"fiber_g":2}
      },
      "healthScore": 7.2,
      "available": true,
      image: 'assets/img/bulgogi.jpg'
    },
    {
      "id": 19,
      "name": "Katsudon",
      "description": "Arroz japonés con chuleta de cerdo empanada, huevo y salsa, servido como un plato completo.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Arroz (210 g)",
        "Chuletas de cerdo (150 g)",
        "Panko (45 g)",
        "Harina (30 g)",
        "Huevo (1 unidad)",
        "Aceite de oliva (1 cucharadita)",
        "Caldo de verduras (60 ml)",
        "Cebolla (1/8 unidad)",
        "Salsa de soja (1 cucharada)",
        "Azúcar (1/2 cucharadita)",
        "Sal y pimienta"
      ],
      "allergens": ["Gluten","Huevo"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 550,
      "price": 7.5,
      "nutrition": {
        "macronutrients": {"protein_g":30,"carbohydrates_g":70,"fat_g":20,"fiber_g":3}
      },
      "healthScore": 7.0,
      "available": true,
      image: 'assets/img/katsudon.jpg'
    },
    {
      "id": 20,
      "name": "Pollo a la mantequilla",
      "description": "Pollo al estilo indio en salsa cremosa de tomate y especias, con un toque de mantequilla y garam masala.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Pechuga de pollo (125 g)",
        "Cebolla (1/4 unidad)",
        "Ajo (1 diente)",
        "Jengibre (pequeño trozo)",
        "Tomate triturado (50 ml)",
        "Nata para cocinar (25 ml)",
        "Mantequilla (12 g)",
        "Garam masala (1/4 cucharada)",
        "Cúrcuma (1/4 cucharadita)",
        "Aceite de oliva (1 cucharadita)"
      ],
      "allergens": ["Lácteos"],
      "side_dishes": [],
      "category": "Principal",
      "calories": 400,
      "price": 7,
      "nutrition": {
        "macronutrients": {"protein_g":30,"carbohydrates_g":8,"fat_g":28,"fiber_g":2}
      },
      "healthScore": 7.2,
      "available": true,
      image: 'assets/img/pollomantequilla.jpg'
    },
    {
      "id": 21,
      "name": "Mango Sticky Rice",
      "description": "Arroz glutinoso cocido con leche de coco, azúcar y mango fresco, dulce y aromático.",
      "servings": 1,
      "units": "1 plato",
      "ingredients": [
        "Arroz glutinoso (50 g)",
        "Leche de coco (62 ml)",
        "Azúcar (3/4 cucharada)",
        "Sal (pizca)",
        "Mango maduro (1/4 unidad)"
      ],
      "allergens": ["Lácteos"],
      "side_dishes": [],
      "category": "Postre",
      "calories": 250,
      "price": 5,
      "nutrition": {
        "macronutrients": {"protein_g":3,"carbohydrates_g":55,"fat_g":8,"fiber_g":2}
      },
      "healthScore": 8.2,
      "available": true,
      image: 'assets/img/mango.jpg'
    },
    {
      "id": 22,
      "name": "Mochis",
      "description": "Dulce japonés de harina de arroz glutinoso relleno de anko o helado.",
      "servings": 1,
      "units": "2 mochis",
      "ingredients": [
        "Harina de arroz glutinoso (75 g)",
        "Azúcar (50 g)",
        "Agua (100 ml)",
        "Almidón de maíz (maicena, 1 cucharadita)",
        "Relleno al gusto (pasta de judía roja o helado, 30 g)"
      ],
      "allergens": ["Gluten"],
      "side_dishes": [],
      "category": "Postre",
      "calories": 300,
      "price": 5,
      "nutrition": {
        "macronutrients": {"protein_g":3,"carbohydrates_g":65,"fat_g":1,"fiber_g":1}
      },
      "healthScore": 8.0,
      "available": true,
      image: 'assets/img/mochis.jpg'
    },
    {
      "id": 23,
      "name": "Tortitas coreanas",
      "description": "Hotteok coreano, tortita rellena de azúcar moreno, canela y nueces.",
      "servings": 1,
      "units": "1 tortita",
      "ingredients": [
        "Harina de trigo (125 g)",
        "Levadura seca (1/2 cucharadita)",
        "Agua templada (75 ml)",
        "Azúcar (1/2 cucharada)",
        "Sal (pizca)",
        "Azúcar moreno (12 g)",
        "Canela (1/2 cucharadita)",
        "Nueces picadas (10 g)"
      ],
      "allergens": ["Gluten","Frutos secos"],
      "side_dishes": [],
      "category": "Postre",
      "calories": 300,
      "price": 4.5,
      "nutrition": {
        "macronutrients": {"protein_g":5,"carbohydrates_g":45,"fat_g":10,"fiber_g":3}
      },
      "healthScore": 7.7,
      "available": true,
      image: 'assets/img/tortitas.jpg'
    },
    {
      "id": 24,
      "name": "Tarta de chocolate y matcha",
      "description": "Tarta de chocolate blanco con toque de té matcha, esponjosa y dulce.",
      "servings": 1,
      "units": "1 porción",
      "ingredients": [
        "Chocolate blanco (50 g)",
        "Nata (25 ml)",
        "Huevos (1 unidad)",
        "Azúcar (12 g)",
        "Harina (20 g)",
        "Té matcha en polvo (1/2 cucharada)",
        "Mantequilla para el molde (5 g)"
      ],
      "allergens": ["Lácteos","Huevo","Gluten"],
      "side_dishes": [],
      "category": "Postre",
      "calories": 350,
      "price": 5.5,
      "nutrition": {
        "macronutrients": {"protein_g":5,"carbohydrates_g":40,"fat_g":22,"fiber_g":2}
      },
      "healthScore": 7.8,
      "available": true,
      image: 'assets/img/tarta.jpg'
    }
  ];

  constructor(private http: HttpClient) {}

  async cargarInicial(): Promise<void> {
    try {
      const platosApi = await firstValueFrom(
        this.http.get<PlatoApiResponse[]>(this.apiUrl)
      );

      if (Array.isArray(platosApi) && platosApi.length > 0) {
        this.platos = this.mezclarPlatosLocalesConApi(platosApi);
      }
    } catch (error) {
      console.warn('No se han podido cargar los platos desde la API. Se usan los datos locales.', error);
    }
  }

  obtenerPlatos(): Plato[] {
    return this.platos;
  }
  private calcularHealthScoreDesdeMacros(macros: Macronutrients): number {
    const scoreBase =
      (macros.protein_g * 0.3) +
      (macros.fiber_g * 0.4) -
      (macros.fat_g * 0.15) +
      (macros.carbohydrates_g * 0.05);

    const scoreNormalizado = Math.max(0, Math.min(10, scoreBase));
    return Number(scoreNormalizado.toFixed(1));
  }

  obtenerPlatoPorId(id: number): Plato | undefined {
    return this.platos.find(plato => plato.id === id);
  }

  recalcularHealthScoreDePlato(id: number): number | null {
    const plato = this.obtenerPlatoPorId(id);

    if (!plato) {
      return null;
    }

    const nuevoScore = this.calcularHealthScoreDesdeMacros(
      plato.nutrition.macronutrients
    );

    plato.healthScore = nuevoScore;

    return nuevoScore;
  }

  recalcularHealthScoresTodos(): Plato[] {
    return this.platos.map(plato => {
      plato.healthScore = this.calcularHealthScoreDesdeMacros(
        plato.nutrition.macronutrients
      );
      return plato;
    });
  }

  private mezclarPlatosLocalesConApi(platosApi: PlatoApiResponse[]): Plato[] {
    return this.platos.map(platoLocal => {
      const platoApi = platosApi.find(plato => plato.id === platoLocal.id);

      if (!platoApi) {
        return platoLocal;
      }

      return {
        ...platoLocal,
        name: platoApi.nombre,
        description: platoApi.descripcion,
        allergens: platoApi.allergens ?? platoLocal.allergens,
        category: platoApi.categoria,
        calories: platoApi.calorias,
        price: platoApi.precio,
        healthScore: platoApi.healthScore,
        available: Boolean(platoApi.disponible),
        image: platoApi.imagen,
        nutrition: {
          macronutrients: {
            protein_g: platoApi.protein_g,
            carbohydrates_g: platoApi.carbohydrates_g,
            fat_g: platoApi.fat_g,
            fiber_g: platoApi.fiber_g
          }
        }
      };
    });
  }
}
