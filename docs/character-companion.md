# Leaf traveler / 星芽旅人

The leaf traveler is a separate character IP, not the SpaceYew navigation mark or favicon. `/ip` is the interactive showcase. It preserves the selected dusty periwinkle hat, butter-yellow scarf and ivory body on alpha-transparent artwork.

`CharacterCompanion` composites the original eyes over an eyeless animation base. Both artwork layers keep their original 1254×1254 coordinates. SVG clips isolate the actual eyes; independent eyelids and Web Animations provide blinking. Pointer movement changes the gaze by at most seven source pixels horizontally and five vertically. The body breathes gently, and clicking or keyboard-activating the character produces a short greeting. Touch activation works without pointer tracking.

The visible page provides explicit Blink, Pause/Resume and background controls. Background color belongs to the preview surface, not the artwork. Image decode completes before the original portrait is replaced. Failed loading retains the original complete image. Automatic motion stops when paused, offscreen, hidden, or when the system requests reduced motion; manual greeting remains available as text in reduced motion. Timers, observers, animation frames, listeners and animations are cleaned up on unmount. No new runtime dependency or video service is required.

## Artwork provenance

Generated and edited with OpenAI's built-in image generation tool, selected in this chat. The original source is retained locally; optimized WebP deliverables live in `public/images/companion/`. Each WebP embeds an XMP provenance summary. No private account information is included in prompts or metadata.

Prompt set, condensed faithfully:

1. Original: an original central leaf-hat traveler mascot, ivory bean body, oversized teal leaf hat, navy eyes, orange scarf, tactile editorial gouache, full body, no lettering or background, true alpha transparency.
2. Selected colorway: preserve identity, pose, proportions, texture and composition; recolor the leaf hat dusty periwinkle with indigo shadows and pale veins, the scarf buttery golden yellow, the body ivory with lavender shadows. Preserve transparent surroundings.
3. Animation base: remove only both eyes and highlights, fill the eye areas with matching continuous ivory face texture; preserve all geometry, palette, framing and alpha transparency. Source-aligned eye regions are composited independently in the browser.

The current deliverable is an interactive web character, not an exported video, GIF, skeletal rig, or frame-by-frame character animation. The hat and scarf retain their illustrated shapes and move with the body.
