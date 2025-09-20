declare module 'https://cdn.jsdelivr.net/npm/opencc-rust/dist/opencc-rust.mjs' {
  export function initOpenccRust(): Promise<void>;
  export function getConverter(): {
    convert: (text: string) => Promise<string>;
  };
}

// Allow wildcard import if different CDN URL is used
declare module 'opencc-rust' {
  export function initOpenccRust(): Promise<void>;
  export function getConverter(): {
    convert: (text: string) => Promise<string>;
  };
}

declare module './translation-engines/opencc' {
  export function init(): Promise<void>;
  export function convert(text: string): Promise<string>;
}
