# Character care and games

Human characters can hug a cushion, give five, enjoy tea and a cookie, rest under a blanket, and play catch with keys. The shark enjoys scratches by its fin, a fin-five, a fish treat, bubbles, and a nap in a bath with a duck. The main care menu keeps three buttons, with support and treats under “Ещё немного заботы”. Cat petting, ball play and rest remain available.

All characters now render through a 640×480 canvas instead of a 160×120 intermediate bitmap. The existing proportions and pixel outlines remain; source artwork is no longer reduced to a small bitmap before being enlarged. Three new transparent care atlases use the existing woman, man and shark as references.

Care saves through the existing revision-checked backend. Affection and high-five share a cooldown; treats have a five-minute cooldown and restore a small amount of energy. Care awards no REP or CR. Full-energy rest now lasts until waking or the first recovery interval. Keyboard input, sound controls and reduced-motion mode are supported.

Validation: ten pet-core tests pass, including legacy state preservation, shared cooldown, bounded treat effects, rest and character-specific actions. Browser checks at 390×844 covered both human variants, hug, high-five, tea, key throws, shark scratches, fin-five, fish, bubble play, rest/wake and reload. No browser errors occurred in the tested flow. 800 unique PDD questions and existing route files remain unchanged.

Artwork: generated with the built-in ImageGen, not the paid application API. Each prompt required the exact existing character identity, outfit, palette and pixel outline in a transparent 4×2 atlas: affectionate pose, content affection, support invitation, support response, treat invitation, content treat, sleep, game-ready pose. Original reference PNGs and generated atlases stay in assets/pet. No API key or personal user photo is included.
