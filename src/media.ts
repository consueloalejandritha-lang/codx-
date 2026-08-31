import generated from './generated/media-manifest.json';

type Variant = { url: string; bytes: number; width?: number; height?: number; maxTexture?: number };
type Motion = { url: string; poster: string; bytes: number; posterBytes: number };
type MediaEntry = { kind: string; default: string; mobile?: string; variants: Variant[]; motion?: Motion };
const entries = generated.entries as Record<string, MediaEntry>;

export function motionAsset(source: string) { return entries[source]?.motion; }

export function assetUrl(source: string, compact = false) {
  const entry = entries[source];
  return entry ? (compact && entry.mobile ? entry.mobile : entry.default) : source;
}

export function imageProps(source: string, sizes = '100vw') {
  const entry = entries[source];
  if (!entry || entry.kind !== 'image') return { src: source };
  return {
    src: entry.default,
    srcSet: entry.variants.map(v => `${v.url} ${v.width}w`).join(', '),
    sizes,
  };
}

// Match the existing fixed two-column archives and four-column animation strip.
export const IMAGE_SIZES = {
  pair: '(max-width: 800px) calc((100vw - 60px) / 2), (max-width: 1764px) calc((100vw - 140px) / 2), 800px',
  full: '(max-width: 800px) calc(100vw - 46px), (max-width: 1764px) calc(100vw - 100px), 1640px',
  spin: '(max-width: 800px) calc((100vw - 47px) / 4), (max-width: 1764px) calc((100vw - 120px) / 4), 412px',
  featuredMain: '(max-width: 1100px) calc(100vw - 40px), (max-width: 1764px) 58vw, 1050px',
  featuredSide: '(max-width: 800px) calc(100vw - 32px), (max-width: 1100px) 46vw, (max-width: 1764px) 35vw, 630px',
};
