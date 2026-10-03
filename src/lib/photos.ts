import type { ImageMetadata } from 'astro';
import acaiBowl from '@/assets/photos/acai-bowl.jpg';
import pokeBowl from '@/assets/photos/poke-bowl.jpg';
import avoToast from '@/assets/photos/avo-toast.jpg';
import wrap from '@/assets/photos/wrap.jpg';
import latte from '@/assets/photos/latte.jpg';
import croissants from '@/assets/photos/croissants.jpg';
import smoothie from '@/assets/photos/smoothie.jpg';
import carrotCake from '@/assets/photos/carrot-cake.jpg';
import pizza from '@/assets/photos/pizza.jpg';
import uluwatuCliffs from '@/assets/photos/uluwatu-cliffs.jpg';
import canggu from '@/assets/photos/canggu-ricefield.jpg';
import spaceAiry from '@/assets/photos/space-airy.jpg';
import spacePlants from '@/assets/photos/space-plants.jpg';
import spaceBar from '@/assets/photos/space-bar.jpg';
import spaceRattan from '@/assets/photos/space-rattan.jpg';
import eveningLamps from '@/assets/photos/evening-lamps.jpg';
import pastriesTable from '@/assets/photos/pastries-table.jpg';
import juiceBottles from '@/assets/photos/juice-bottles.jpg';
import bagel from '@/assets/photos/bagel.jpg';
import salad from '@/assets/photos/salad.jpg';
import gelato from '@/assets/photos/gelato.jpg';
import cocktails from '@/assets/photos/cocktails.jpg';
import pantry from '@/assets/photos/pantry.jpg';
import brownie from '@/assets/photos/brownie.jpg';

/**
 * Every image on the site is licensed Unsplash stock standing in for the café's own photos.
 * Alt text describes the stock photo, not a NOURISH dish or venue. Keep CREDITS.md in sync (a test checks it).
 */
export interface Photo {
  src: ImageMetadata;
  alt: string;
  photographer: string;
  username: string;
  page: string;
  /** CSS object-position, so wide crops keep the subject in frame. */
  position?: string;
}

const u = (id: string) => `https://unsplash.com/photos/${id}`;

export const photos = {
  acaiBowl: { src: acaiBowl, alt: 'Açaí bowl topped with blueberries, banana and strawberries', photographer: 'Eiliv Aceron', username: 'shootdelicious', page: u('NI8MeJiAN3I') },
  pokeBowl: { src: pokeBowl, alt: 'Poke bowl with salmon, cucumber and edamame', photographer: 'Miu Sua', username: 'phanhfank', page: u('pO9851jklaE') },
  avoToast: { src: avoToast, alt: 'Smashed avocado on toast with feta', photographer: 'Fernanda Martinez', username: 'fermtz05', page: u('ZSAE2DubK94') },
  wrap: { src: wrap, alt: 'A wrap cut in half on a plate', photographer: 'Farhad Ibrahimzade', username: 'ferhadd', page: u('riLJ2t6VEmE'), position: 'center 65%' },
  latte: { src: latte, alt: 'Latte with leaf latte art, from above', photographer: 'Phil Desforges', username: 'storybyphil', page: u('Nw8wbiDE3gU') },
  croissants: { src: croissants, alt: 'Freshly baked croissants on baking paper', photographer: 'Conor Brown', username: 'commonboxturtle', page: u('sqkXyyj4WdE') },
  smoothie: { src: smoothie, alt: 'Purple smoothie in a glass topped with granola', photographer: 'Bakd&Raw by Karolin Baitinger', username: 'bakdandraw', page: u('G-qUSofkSr4'), position: 'center 40%' },
  carrotCake: { src: carrotCake, alt: 'Slice of layered carrot cake with walnuts', photographer: 'Orkun Orcan', username: 'orkunorcan', page: u('EvfXG4aK9d8'), position: 'center 70%' },
  pizza: { src: pizza, alt: 'Margherita-style pizza with fresh mozzarella and basil', photographer: 'Joanie Simon', username: 'joaniesimon', page: u('T0q4_yyQ4Hg'), position: 'center 45%' },
  uluwatuCliffs: { src: uluwatuCliffs, alt: 'Limestone cliffs and surf near Uluwatu', photographer: 'Alexandra Smielova', username: 'sashasmelova', page: u('4euu6M6opno') },
  canggu: { src: canggu, alt: 'Green rice field at sunrise in Canggu', photographer: 'Timur Kozmenko', username: 'timrael', page: u('yJw24vLHCuo'), position: 'center 70%' },
  spaceAiry: { src: spaceAiry, alt: 'Bright café with white brick walls, trees and people at tables', photographer: 'Le Yien', username: 'leyien_', page: u('H9tbP77wdtQ'), position: 'center 70%' },
  spacePlants: { src: spacePlants, alt: 'Glass-walled café full of plants, concrete columns and a paper lantern', photographer: 'Nate Holland', username: 'nateh0lland', page: u('SS_KVhJgNN0'), position: 'center 55%' },
  spaceBar: { src: spaceBar, alt: 'Café counter with stools and a wall of tropical plants', photographer: 'note thanun', username: 'notethanun', page: u('Fk76X2w3aZ8') },
  spaceRattan: { src: spaceRattan, alt: 'Café with wooden chairs, hanging plants and a rattan pendant lamp', photographer: 'Michael Moloney', username: 'mjmolo', page: u('V5PpzcX9Nlw') },
  eveningLamps: { src: eveningLamps, alt: 'Woven wicker pendant lights glowing against an evening sky', photographer: 'Olga Latiy', username: 'olga_maya', page: u('e5MMb1oeecw') },
  pastriesTable: { src: pastriesTable, alt: 'Hands reaching for pastries and coffee on a wooden table', photographer: 'Juan Pablo Lara', username: 'sanpablico', page: u('asJwjrdJf0g') },
  juiceBottles: { src: juiceBottles, alt: 'Three bottles of green juice with citrus slices', photographer: 'Birgith Roosipuu', username: 'msbirgith', page: u('hom5fPULf4I') },
  bagel: { src: bagel, alt: 'Smoked salmon bagel with greens and lemon', photographer: 'Janet Ganbold', username: 'j4net999', page: u('NuVBjuzUmBQ') },
  salad: { src: salad, alt: 'Grain and vegetable bowl on a wooden table', photographer: 'Rod Long', username: 'rodlong', page: u('s65Mx0PG-bM') },
  gelato: { src: gelato, alt: 'Cup of gelato with wooden spoons', photographer: 'Adriel Prastyanto', username: 'adrielprastyanto', page: u('8n1kes2iSyE'), position: 'center 45%' },
  cocktails: { src: cocktails, alt: 'Three cocktails with lime and mint on a wooden bar', photographer: 'Kobby Mendez', username: 'kobbymendez', page: u('xBFTjrMIC0c') },
  pantry: { src: pantry, alt: 'Wooden shelves stocked with jars and pantry goods', photographer: 'Artem Kostelnyuk', username: 'abra_kadaaabra', page: u('NrqKwJ1KPo8') },
  brownie: { src: brownie, alt: 'Piece of brownie on a speckled plate', photographer: 'Nick Doberman', username: 'sillynickdobie', page: u('co9X2OlPkUo') },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

export const branchPhoto: Record<'uluwatu' | 'ungasan' | 'berawa', PhotoKey> = {
  uluwatu: 'uluwatuCliffs',
  ungasan: 'pizza',
  berawa: 'canggu',
};

/** "The space" pairs per branch: stand-ins for interior shots until the café's own photos arrive. */
export const branchSpace: Record<'uluwatu' | 'ungasan' | 'berawa', [PhotoKey, PhotoKey]> = {
  uluwatu: ['spaceRattan', 'pantry'],
  ungasan: ['spaceBar', 'pastriesTable'],
  berawa: ['spaceAiry', 'juiceBottles'],
};

/** One photo per main menu category. Categories not listed show without a photo. */
export const categoryPhoto: Partial<Record<string, PhotoKey>> = {
  'all-day-breakfast': 'avoToast',
  'breakfast-bowls': 'acaiBowl',
  rolls: 'bagel',
  bakery: 'croissants',
  'bigger-stuff': 'pokeBowl',
  'salad-bowls': 'salad',
  'burgers-and-wraps': 'wrap',
  pizza: 'pizza',
  desserts: 'brownie',
  cakes: 'carrotCake',
  gelato: 'gelato',
  smoothies: 'smoothie',
  juices: 'juiceBottles',
  coffee: 'latte',
  cocktails: 'cocktails',
};
