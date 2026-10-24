import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { catalog } from '../src/content/catalog.ts';
import { generatePuzzles, algorithmVersion } from '../src/content/generator.ts';
import { auditSchedule } from '../src/content/audit.ts';
import { qualityProfile, validateProfile } from '../src/content/quality.ts';
import { excludedCountries } from '../src/content/eligibility.ts';

const usage = `Usage:
  npm run puzzles:audit -- [--input schedule.json] [--profile profile.json] [--report report.json]
  npm run puzzles:generate -- [--seed 42] [--count 7] [--attempts 100000] [--trace 30]
    [--profile profile.json] [--output candidates.json] [--report report.json]

Generation proposes candidates; it never publishes or changes the current schedule by default.
--report writes a machine-readable JSON file and a companion Markdown report (contains solutions).
An exhausted search or rejected audit exits with status 1; partial output is retained for inspection.`;
const args = process.argv.slice(2);
const mode = args.shift();
if (args.includes('--help') || mode === '--help') {
  console.log(usage);
} else {
  try {
    if (!['audit', 'generate'].includes(mode)) throw new Error(usage);
    const allowed = mode === 'audit' ? ['input','profile','report'] : ['seed','count','attempts','trace','profile','output','report'];
    const flags = {};
    while (args.length) {
      const key = args.shift()?.replace(/^--/, '');
      const value = args.shift();
      if (!allowed.includes(key) || !value || value.startsWith('--') || key in flags) throw new Error(`Invalid or duplicate option: ${key}\n${usage}`);
      flags[key] = value;
    }
    const profile = flags.profile ? JSON.parse(await readFile(flags.profile, 'utf8')) : qualityProfile;
    validateProfile(profile);
    let result;
    let definitions;
    if (mode === 'generate') {
      result = generatePuzzles({catalog, profile, seed:Number(flags.seed ?? 42), count:Number(flags.count ?? 7), maxAttempts:Number(flags.attempts ?? 100000), traceLimit:Number(flags.trace ?? 30)});
      definitions = result.puzzles;
      if (flags.output) await save(flags.output, JSON.stringify({
        epoch:'2026-10-22',
        generation:{algorithmVersion, catalogVersion:catalog.version, seed:result.seed, profile, maxAttempts:result.maxAttempts, attempts:result.attempts},
        puzzles:definitions,
      }, null, 2) + '\n');
      console.log(`${definitions.length}/${result.requested} accepted in ${result.attempts}/${result.maxAttempts} attempts; ${result.exhausted ? 'budget exhausted' : 'complete'}. Seed ${result.seed}.`);
      console.log('Rejections (an attempt can fail more than one check):', result.rejectionCounts);
    } else {
      const schedule = JSON.parse(await readFile(flags.input ?? new URL('../src/content/puzzles.json', import.meta.url), 'utf8'));
      if (!Array.isArray(schedule.puzzles)) throw new Error('Input must contain a puzzles array.');
      definitions = schedule.puzzles;
      result = auditSchedule(catalog, definitions, profile);
    }
    const audit = mode === 'audit' ? result : auditSchedule(catalog, definitions, profile);
    console.table(audit.puzzles.map(({definition:d,report:r,error}) => ({
      puzzle:d.id, accepted:r?.accepted ?? false,
      triples:r?.analysis.validBySize[3] ?? 0, fours:r?.analysis.validBySize[4] ?? 0,
      fives:r?.analysis.validBySize[5] ?? 0, sixes:r?.analysis.validBySize[6] ?? 0,
      irreducible4:r?.analysis.irreducibleBySize[4] ?? 0, irreducible5:r?.analysis.irreducibleBySize[5] ?? 0,
      problem:error ?? r?.issues.map((i)=>i.code).join(', '),
    })));
    if (audit.issues.length) console.log(audit.issues);
    if (flags.report) {
      if (!flags.report.endsWith('.json')) throw new Error('--report must end in .json.');
      await save(flags.report, JSON.stringify(result,null,2)+'\n');
      const mdPath = flags.report.replace(/\.json$/, '.md');
      await save(mdPath, renderReport(result, audit, mode));
      console.log(`Reports: ${resolve(flags.report)} and ${resolve(mdPath)}`);
    }
    if (!audit.accepted || result.exhausted) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function save(path, text) {
  await mkdir(dirname(resolve(path)), {recursive:true});
  await writeFile(path,text);
}
function renderReport(result, audit, mode) {
  const name = (id) => catalog.entities.find((e)=>e.id===id)?.name ?? id;
  const lines = [
    '# Puzzle quality report', '',
    `Catalog: **${catalog.version}**. Profile: **${audit.profile.id} v${audit.profile.version}**. Overall audit: **${audit.accepted ? 'PASS' : 'FAIL'}**.`, '',
    'This authoring report contains answers. Difficulty and familiarity are editorial estimates; solution counts describe the board, not observed player scores.', '',
  ];
  if (mode === 'generate') {
    lines.push(`Algorithm: **${result.algorithmVersion}**. Seed: **${result.seed}**. Accepted **${result.puzzles.length}/${result.requested}** after **${result.attempts}/${result.maxAttempts}** attempts. Exhausted: **${result.exhausted}**.`, '',
      'Stages count each attempt once. Rejection counts count each failed check once per attempt, so they can sum to more than the number of attempts.', '',
      '| Final stage | Attempts |','| --- | ---: |', ...Object.entries(result.stages).map(([k,v])=>`| ${k} | ${v} |`), '',
      '| Rejection | Attempts |','| --- | ---: |', ...Object.entries(result.rejectionCounts).map(([k,v])=>`| ${k} | ${v} |`), '',
      `The JSON includes ${result.trace.length} detailed attempt traces; ${result.traceDropped} further traces were omitted by the configured trace limit.`, '');
  }
  lines.push('## Active constraints', '', '```json', JSON.stringify(audit.profile,null,2), '```', '',
    '## Schedule', '', '| Puzzle | Complete 3 / 4 / 5 / 6 | Irreducible 4 / 5 / 6 | Result |', '| --- | --- | --- | --- |');
  for (const {definition:d,report:r,error} of audit.puzzles)
    lines.push(`| ${d.id} | ${[3,4,5,6].map(s=>r?.analysis.validBySize[s] ?? 0).join(' / ')} | ${[4,5,6].map(s=>r?.analysis.irreducibleBySize[s] ?? 0).join(' / ')} | ${error ?? (r.accepted ? 'PASS' : 'FAIL')} |`);
  const usedCountries = new Set(audit.puzzles.flatMap(({definition})=>definition.entityIds));
  const usedRequirements = new Set(audit.puzzles.flatMap(({definition})=>definition.attributeIds));
  lines.push('', `Schedule coverage: **${usedCountries.size}/${catalog.entities.length} countries**, **${usedRequirements.size}/${catalog.attributes.filter(a=>a.generationEnabled!==false).length} enabled requirements**.`, '',
    `Countries absent this batch: ${catalog.entities.filter(e=>!usedCountries.has(e.id)).map(e=>e.name).join(', ') || 'none'}.`, '',
    ...audit.issues.map(i=>`- ${i.code}: ${i.message}`));
  for (const {definition:d,report:r,error} of audit.puzzles) {
    lines.push('', `## ${d.id}`, '');
    if (error) {lines.push(error);continue;}
    const attrs=d.attributeIds.map(id=>catalog.attributes.find(a=>a.id===id));
    lines.push('| Requirement | Family | Reasoning | Difficulty | Matches |','| --- | --- | --- | --- | ---: |',
      ...attrs.map(a=>`| ${a.label} | ${a.family} | ${a.reasoning} | ${a.difficulty} | ${r.analysis.attributeFrequency[a.id]} |`), '',
      `Familiarity: ${JSON.stringify(r.familiarity)}. Subjects: ${JSON.stringify(r.mix.subjects)}.`, '',
      `Excluded countries: ${[...excludedCountries(attrs)].map(([id,reasons])=>`${name(id)} (${reasons.join('; ')})`).join('; ') || 'none'}.`, '',
      '| Selection size | Complete / possible | Completion rate | Irreducible | Prunable |', '| ---: | ---: | ---: | ---: | ---: |',
      ...[3,4,5,6].map(s=>`| ${s} | ${r.analysis.validBySize[s]??0} / ${r.analysis.combinationsBySize[s]??0} | ${((r.analysis.completionRates[s]??0)*100).toFixed(1)}% | ${r.analysis.irreducibleBySize[s]??0} | ${((r.analysis.prunableRates[s]??0)*100).toFixed(1)}% |`), '',
      `Conservative route: ${(d.authoring?.safeSelectionIds??[]).map(name).join(', ')}.`, '',
      'Optimal solutions:', '', ...r.analysis.optimalSolutions.map(ids=>`- ${ids.map(name).join(', ')}`), '',
      'Country answers (numbers refer to requirements in the table above):', '', '| Country | Familiarity | Qualifies for |', '| --- | --- | --- |',
      ...d.entityIds.map(id=>{const e=catalog.entities.find(e=>e.id===id);return `| ${e.name} | ${e.familiarity} | ${attrs.flatMap((a,i)=>e.facts[a.id].value?[i+1]:[]).join(', ')} |`;}), '',
      ...r.issues.map(i=>`- **${i.code}**: ${i.message}`));
  }
  return lines.join('\n')+'\n';
}
