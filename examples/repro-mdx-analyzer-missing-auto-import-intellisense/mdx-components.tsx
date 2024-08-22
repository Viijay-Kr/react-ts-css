import { MDXComponents } from 'mdx/types';
import { HTMLAttributes } from 'react';

type ZoomImageProps = {
  alt: string;
};

export function ZoomImage(props: ZoomImageProps) {
  return <div>www</div>;
}

function CustomCodeSandBox(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

const components = {
  // ZoomImage,
  CustomCodeSandBox,
} satisfies MDXComponents;

declare global {
  type MDXProvidedComponents = typeof components;
}

export function useMDXComponents(): MDXProvidedComponents {
  return components;
}
