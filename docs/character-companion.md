# Leaf traveler / 星芽旅人

The leaf traveler is a separate character IP, not the SpaceYew navigation mark or favicon. `/ip` is the interactive showcase. It preserves the selected dusty periwinkle hat, butter-yellow scarf and ivory body on alpha-transparent artwork.

`CharacterCompanion` composites the original eyes over an eyeless head, with a separate body/scarf plate. Artwork layers keep the original 1254×1254 coordinates. The head retains the original alpha contour; an SVG clip separates only the neck seam. SVG clips also isolate the actual eyes; independent eyelids and Web Animations provide blinking. Automatic blinks occur every 1.6–3.8 seconds, with an occasional second blink 320ms later. A quick blink cannot schedule another quick blink.

Pointer movement changes the gaze by at most seven source pixels horizontally and five vertically. The head and hat turn together around the neck, limited to 10° yaw, 6° pitch and 3° roll with a 420ms settling transition. This is a shallow 2.5D turn of the existing illustration, not newly rendered profile views. The body/scarf remain independent. The Turn head button performs a 1250ms left/right response for mouse, touch or keyboard. The body breathes gently, and activating the character produces a short greeting.

The visible page provides explicit Blink, Turn head, Pause/Resume and background controls. Background color belongs to the preview surface, not the artwork. All three images decode before the original portrait is replaced. Failed loading retains the original complete image. Automatic motion stops when paused, offscreen, hidden, or when the system requests reduced motion; manual greeting remains available as text in reduced motion. Blur resets the head and gaze, and touch pointers do not drive mouse tracking. Timers, observers, animation frames, listeners and animations are cleaned up on unmount. No new runtime dependency or video service is required.

## Artwork provenance

Generated and edited with OpenAI's built-in image generation tool, selected in this chat. The original source is retained locally; optimized WebP deliverables live in `public/images/companion/`. Each WebP embeds an XMP provenance summary. No private account information is included in prompts or metadata.

Prompt set, condensed faithfully:

1. Original: an original central leaf-hat traveler mascot, ivory bean body, oversized teal leaf hat, navy eyes, orange scarf, tactile editorial gouache, full body, no lettering or background, true alpha transparency.
2. Selected colorway: preserve identity, pose, proportions, texture and composition; recolor the leaf hat dusty periwinkle with indigo shadows and pale veins, the scarf buttery golden yellow, the body ivory with lavender shadows. Preserve transparent surroundings.
3. Animation base: remove only both eyes and highlights, fill the eye areas with matching continuous ivory face texture; preserve all geometry, palette, framing and alpha transparency. Source-aligned eye regions are composited independently in the browser.
4. Body plate: remove the hat and face while preserving the scarf, torso, arms, feet, exact scale, source position and transparency. Reconstruct a short ivory neck behind the separately moving head. The head itself is clipped from the original eyeless base, preserving its identity and eye alignment.

The current deliverable is an interactive web character, not an exported video, GIF, skeletal rig, or frame-by-frame character animation. The hat moves with the head; the scarf remains with the body.
