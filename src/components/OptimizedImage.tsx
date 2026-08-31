import type { ImgHTMLAttributes } from 'react';
import { imageProps } from '../media';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> & { src: string };
export default function OptimizedImage({ src, sizes, loading = 'lazy', decoding = 'async', ...props }: Props) {
  return <img {...props} {...imageProps(src, sizes)} loading={loading} decoding={decoding} />;
}
