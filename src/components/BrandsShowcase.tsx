import { useState } from 'react';
import { EUGENE_PERMA_CATALOG } from '../data/catalog.ts';
import type { BrandName, EugeneProduct, Language } from '../types.ts';
import { ProductCard } from './ProductCard.tsx';

interface BrandsShowcaseProps {
  lang: Language;
  onSelectProduct: (product: EugeneProduct) => void;
}

const FILTER_TABS: Array<{ id: 'ALL' | BrandName; label: string }> = [
  { id: 'ALL', label: 'Toutes les gammes' },
  { id: 'ESSENTIEL', label: 'Essentiel' },
  { id: 'COLLECTIONS NATURE', label: 'Collections Nature' },
  { id: 'ARTIST(E)', label: 'Artist(e)' },
  { id: 'BLUSH CARE', label: 'Blush Care & Solaris' },
  { id: 'APHOGEE', label: 'ApHogee' },
];

export function BrandsShowcase({ lang, onSelectProduct }: BrandsShowcaseProps) {
  const [activeBrand, setActiveBrand] = useState<'ALL' | BrandName>('ALL');
  const isFr = lang === 'fr';

  const visibleProducts = EUGENE_PERMA_CATALOG.filter((p) => {
    if (activeBrand === 'ALL') return true;
    if (activeBrand === 'BLUSH CARE') {
      return p.brand === 'BLUSH CARE' || p.brand === 'SOLARIS';
    }
    return p.brand === activeBrand;
  }).slice(0, 6);

  return (
    <section
      id="collections-preview"
      className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-white/10 space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pale-oak">
            {isFr ? 'Maison Eugène Perma · Depuis 1919' : 'Maison Eugène Perma · Since 1919'}
          </p>
          <h2 className="font-serif italic text-2xl sm:text-3xl text-white">
            {isFr
              ? 'Nos marques et soins professionnels'
              : 'Our Signature Haircare Brands'}
          </h2>
        </div>

        {/* Interactive Brand Filter Tabs */}
        <div
          role="tablist"
          aria-label={isFr ? 'Filtrer par marque Eugène Perma' : 'Filter by Eugène Perma brand'}
          className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#141414] border border-white/10"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeBrand === tab.id;
            const label =
              tab.id === 'ALL' && !isFr ? 'All Collections' : tab.label;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveBrand(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-pale-oak text-black font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            lang={lang}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    </section>
  );
}
