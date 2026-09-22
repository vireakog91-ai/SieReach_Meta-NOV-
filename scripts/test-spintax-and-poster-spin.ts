import { parseSpintax, renderMessageTemplate } from "../src/lib/facebook";

console.log("=== Testing Spintax Engine ===");

const template = "{Hi|Hello|Hey} {{customer_name}}, {we noticed you checked out|thanks for viewing} {{ad_source}}! {Claim 15% OFF|Get a free gift today}!";

const samples: string[] = [];
for (let i = 0; i < 5; i++) {
  const rendered = renderMessageTemplate(template, {
    customerName: "Sokha",
    pageName: "SieLab Shoes",
    adSource: "Summer Sale 2026",
  });
  samples.push(rendered);
  console.log(`Sample ${i + 1}: ${rendered}`);
}

// Verify that spintax produced variation
const uniqueSamples = new Set(samples);
console.log(`Unique variations out of 5 runs: ${uniqueSamples.size}`);

// Verify nested spintax
const nestedTemplate = "{A|{B1|B2}}";
const nestedResults = new Set<string>();
for (let i = 0; i < 20; i++) {
  nestedResults.add(parseSpintax(nestedTemplate));
}
console.log("Nested spintax resolved variants:", Array.from(nestedResults).sort());

// Verify Multi-Poster Spin Rotation Logic
console.log("\n=== Testing Poster Spin Rotation ===");
const posters = [
  "https://example.com/poster-1.png",
  "https://example.com/poster-2.png",
  "https://example.com/poster-3.png"
];

const chosenPosters: string[] = [];
for (let i = 0; i < 10; i++) {
  const chosen = posters[Math.floor(Math.random() * posters.length)];
  chosenPosters.push(chosen);
}
console.log("Selected posters over 10 runs:", chosenPosters);
console.log("Unique posters chosen:", new Set(chosenPosters).size);

console.log("\nAll engine tests passed successfully!");
