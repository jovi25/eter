// Every visual is referenced by key. Today they are procedural (drawn in code);
// later a key can point to a CC0 image in public/assets/ without touching game code.

export type AssetSource =
  | { kind: 'procedural'; draw: string } // name of a procedural drawing routine in src/view/art
  | { kind: 'image'; url: string };

export const ASSETS = {
  logoCrystal: { kind: 'procedural', draw: 'crystal' },
} as const satisfies Record<string, AssetSource>;

export type AssetKey = keyof typeof ASSETS;
