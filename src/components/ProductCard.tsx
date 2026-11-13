import { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { EugeneProduct, Language } from '../types.ts';
import { PRODUCT_IMAGES } from '../utils/productImages.ts';

interface ProductCardProps {
  product: EugeneProduct;
  lang: Language;
  onSelect: (product: EugeneProduct) => void;
  compact?: boolean;
}

export function ProductCard({ product, lang, onSelect, compact = false }: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const isFr = lang === 'fr';
  const name = isFr ? product.nameFr : product.nameEn;
  const tagline = isFr ? product.taglineFr : product.taglineEn;
  const stepLabel = isFr ? product.stepLabelFr : product.stepLabelEn;
  const imageSrc = PRODUCT_IMAGES[product.imageKey];

  return (
    <article
      onClick={() => onSelect(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product);
        }
      }}
      tabIndex={0}
      role="button"
      className="group flex flex-col bg-[#161616] border border-white/10 hover:border-pale-oak/60 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-pale-oak cursor-pointer text-left"
    >
      <div className={`relative w-full ${compact ? 'aspect-[4/3]' : 'aspect-[4/3]'} bg-[#0B0B0B] overflow-hidden`}>
        {!imgFailed ? (
          <img
            src={imageSrc}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1C1B19] to-[#0A0A0A] p-4 text-center">
            <Sparkles className="w-6 h-6 text-pale-oak" />
            <span className="text-xs font-serif italic text-pale-oak">{product.brand}</span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none"
        />
        <span className="absolute bottom-2.5 left-3 text-[11px] font-medium text-pale-oak tracking-wide">
          {stepLabel}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/55">
            <span className="text-pale-oak">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.volume}</span>
          </div>
          <h4 className="text-sm sm:text-[15px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-pale-oak transition-colors">
            {name}
          </h4>
          {!compact && (
            <p className="text-xs text-white/65 leading-relaxed line-clamp-2">
              {tagline}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white tabular-nums">
            {product.priceEur.toFixed(2).replace('.', ',')} €
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-pale-oak group-hover:underline underline-offset-4 whitespace-nowrap">
            {isFr ? 'Mode d’emploi' : 'How to use'}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
