import type { ImageKey } from '../types.ts';
import essentielImg from '../assets/images/eugene_essentiel_keratin_1794587180381.jpg';
import natureImg from '../assets/images/eugene_collections_nature_1794587180743.jpg';
import artisteImg from '../assets/images/eugene_artiste_styling_1794587181738.jpg';
import blondImg from '../assets/images/eugene_blush_solaris_blond_1794587182100.jpg';
import aphogeeImg from '../assets/images/eugene_aphogee_repair_1794587182197.jpg';
import atelierImg from '../assets/images/eugene_camille_atelier_1794587182917.jpg';

export const PRODUCT_IMAGES: Record<ImageKey, string> = {
  essentiel: essentielImg,
  nature: natureImg,
  artiste: artisteImg,
  blond: blondImg,
  aphogee: aphogeeImg,
  atelier: atelierImg,
};
