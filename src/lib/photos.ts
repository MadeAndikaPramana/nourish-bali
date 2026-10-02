import type { ImageMetadata } from 'astro';
import bowlHero from '@/assets/photos/bowl-hero.jpg';
import acaiBowl from '@/assets/photos/acai-bowl.jpg';
import pokeBowl from '@/assets/photos/poke-bowl.jpg';
import shakshuka from '@/assets/photos/shakshuka.jpg';
import avoToast from '@/assets/photos/avo-toast.jpg';
import wrap from '@/assets/photos/wrap.jpg';
import frenchToast from '@/assets/photos/french-toast.jpg';
import latte from '@/assets/photos/latte.jpg';
import croissants from '@/assets/photos/croissants.jpg';
import smoothie from '@/assets/photos/smoothie.jpg';
import carrotCake from '@/assets/photos/carrot-cake.jpg';
import pizza from '@/assets/photos/pizza.jpg';
import uluwatuCliffs from '@/assets/photos/uluwatu-cliffs.jpg';
import bukitCoast from '@/assets/photos/bukit-coast.jpg';
import canggu from '@/assets/photos/canggu-ricefield.jpg';

/**
 * Every image on the site is licensed Unsplash stock standing in for the café's own photos.
 * Alt text describes the stock photo, not a NOURISH dish. Keep CREDITS.md in sync (a test checks it).
 */
export interface Photo {
  src: ImageMetadata;
  alt: string;
  photographer: string;
  username: string;
  page: string;
}

const u = (id: string) => `https://unsplash.com/photos/${id}`;

export const photos = {
  bowlHero: { src: bowlHero, alt: 'Smoothie bowl with berries, banana and granola', photographer: 'Abdelrahman Sarayreh', username: 'sarayra', page: u('AqlcqCzF3aQ') },
  acaiBowl: { src: acaiBowl, alt: 'Açaí bowl topped with blueberries, banana and strawberries', photographer: 'Eiliv Aceron', username: 'shootdelicious', page: u('NI8MeJiAN3I') },
  pokeBowl: { src: pokeBowl, alt: 'Poke bowl with salmon, cucumber and edamame', photographer: 'Miu Sua', username: 'phanhfank', page: u('pO9851jklaE') },
  shakshuka: { src: shakshuka, alt: 'Baked eggs in tomato sauce with toasted bread', photographer: 'Toa Heftiba', username: 'heftiba', page: u('gWkvURhoMlA') },
  avoToast: { src: avoToast, alt: 'Smashed avocado on toast with feta', photographer: 'Fernanda Martinez', username: 'fermtz05', page: u('ZSAE2DubK94') },
  wrap: { src: wrap, alt: 'A wrap cut in half on a plate', photographer: 'Farhad Ibrahimzade', username: 'ferhadd', page: u('riLJ2t6VEmE') },
  frenchToast: { src: frenchToast, alt: 'French toast stack with strawberries and ice cream', photographer: 'amirali mirhashemian', username: 'amir_v_ali', page: u('SDMmCp4on3k') },
  latte: { src: latte, alt: 'Latte with leaf latte art, from above', photographer: 'Phil Desforges', username: 'storybyphil', page: u('Nw8wbiDE3gU') },
  croissants: { src: croissants, alt: 'Freshly baked croissants on baking paper', photographer: 'Conor Brown', username: 'commonboxturtle', page: u('sqkXyyj4WdE') },
  smoothie: { src: smoothie, alt: 'Purple smoothie in a glass topped with granola', photographer: 'Bakd&Raw by Karolin Baitinger', username: 'bakdandraw', page: u('G-qUSofkSr4') },
  carrotCake: { src: carrotCake, alt: 'Slice of layered carrot cake with walnuts', photographer: 'Orkun Orcan', username: 'orkunorcan', page: u('EvfXG4aK9d8') },
  pizza: { src: pizza, alt: 'Margherita-style pizza with fresh mozzarella and basil', photographer: 'Joanie Simon', username: 'joaniesimon', page: u('T0q4_yyQ4Hg') },
  uluwatuCliffs: { src: uluwatuCliffs, alt: 'Limestone cliffs and surf near Uluwatu', photographer: 'Alexandra Smielova', username: 'sashasmelova', page: u('4euu6M6opno') },
  bukitCoast: { src: bukitCoast, alt: 'Cliffs above the sea on the Bukit with pink bougainvillea', photographer: 'Jared Schwitzke', username: 'jaredschwitzke', page: u('aVvckzTWWCc') },
  canggu: { src: canggu, alt: 'Green rice field at sunrise in Canggu', photographer: 'Timur Kozmenko', username: 'timrael', page: u('yJw24vLHCuo') },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

export const branchPhoto: Record<'uluwatu' | 'ungasan' | 'berawa', PhotoKey> = {
  uluwatu: 'uluwatuCliffs',
  ungasan: 'pizza',
  berawa: 'canggu',
};

/** Signature strip: dish names that appear on the real menus, each with a stand-in photo. */
export const signatureDishes: { name: string; menuName: string; photo: PhotoKey; branches: string }[] = [
  { name: 'Açaí bowls', menuName: 'Fill Me Up Protein', photo: 'acaiBowl', branches: 'All cafés' },
  { name: 'Poke bowl', menuName: 'Poke Bowl', photo: 'pokeBowl', branches: 'All cafés' },
  { name: 'Shakshuka', menuName: 'Baked Skillet Eggs', photo: 'shakshuka', branches: 'All cafés' },
  { name: 'Smashed avo', menuName: 'Smashed Avo Stack', photo: 'avoToast', branches: 'All cafés' },
  { name: 'Falafel wrap', menuName: 'Falafel Wrap', photo: 'wrap', branches: 'All cafés' },
  { name: 'French toast', menuName: 'French Toast', photo: 'frenchToast', branches: 'All cafés' },
  { name: 'Pizza', menuName: 'Gourmet Pizzas', photo: 'pizza', branches: 'Uluwatu & Ungasan' },
  { name: 'Carrot cake', menuName: 'Carrot Cake', photo: 'carrotCake', branches: 'All cafés' },
  { name: 'Smoothies', menuName: 'Pink Flamingo', photo: 'smoothie', branches: 'All cafés' },
  { name: 'Coffee', menuName: 'Latte', photo: 'latte', branches: 'All cafés' },
];
