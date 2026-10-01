/**
 * Spintax Parser
 * Handles variations like:
 * "Hello {world|friend|there}! Don't miss our {🔥 Hot Deal|⚡ Exclusive Promo}!"
 * Also supports nested spintax: "{A|{B|C}}"
 */

export function parseSpintax(text: string): string {
  if (!text) return "";

  const spintaxRegex = /\{([^{}]+)\}/;
  let matches;
  let result = text;
  let iterations = 0;

  while ((matches = spintaxRegex.exec(result)) && iterations < 50) {
    const options = matches[1].split("|");
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.replace(matches[0], chosen);
    iterations++;
  }

  return result;
}

/**
 * Returns a list of possible variations count approximation
 */
export function countSpintaxVariations(text: string): number {
  if (!text) return 1;
  const spintaxRegex = /\{([^{}]+)\}/g;
  let count = 1;
  let match;

  while ((match = spintaxRegex.exec(text)) !== null) {
    const options = match[1].split("|");
    count *= options.length;
  }

  return count;
}
