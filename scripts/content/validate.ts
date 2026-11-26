// Checks every file in content/. Exits with an error if anything is wrong.
// Usage: npm run content:check
import { formatProblems, loadContent } from './load.ts';

const { content, problems } = loadContent();
const proverbs = content.lessons.flatMap((l) => l.proverbs);
const unfilled = proverbs.filter((p) => !p.text_simp || !p.pinyin || !p.jyutping);

if (problems.length > 0) {
  console.error(`Content has ${problems.length} problem(s):\n${formatProblems(problems)}`);
  process.exit(1);
}
if (unfilled.length > 0) {
  console.error(
    `${unfilled.length} entr(ies) have no simplified text or readings yet: ` +
      `${unfilled.map((p) => p.id).join(', ')}.\nRun "npm run content:fill", then check the result.`,
  );
  process.exit(1);
}

const reviewed = proverbs.filter((p) => p.reviewed).length;
console.log(
  `Content OK: ${content.lessons.length} lesson(s), ${proverbs.length} proverb(s), ` +
    `${reviewed} reviewed, ${content.themes.length} themes.`,
);
