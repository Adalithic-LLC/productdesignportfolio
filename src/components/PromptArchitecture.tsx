import { useState } from 'react';

/**
 * "The modular prompt system" — an interactive read of how Arcatext assembles
 * each LLM call out of small, reusable prompt modules.
 *
 * Ported from the standalone prompt-system-diagram.html into the site's own
 * tokens, so it follows the page theme rather than carrying its own toggle.
 * The two accents line up exactly: the diagram's blue is `primary` and its
 * teal is `accent`.
 *
 * Left column: the module menu the user clicks. Right column: the system
 * prompt those choices assemble into, in the order it is sent. Above both, a
 * plain-English sentence narrating the current build.
 */

type Lang = {
  name: string;
  nonLatin?: boolean;
  script?: string;
  roman?: string;
  /** Serbian writes natively in both Cyrillic and Latin, so no chain-of-thought step. */
  nativeLatin?: boolean;
};

const LANGS: Record<string, Lang> = {
  en: { name: 'English' },
  es: { name: 'Spanish' },
  fr: { name: 'French' },
  de: { name: 'German' },
  ja: { name: 'Japanese', nonLatin: true, script: 'Japanese (kanji + kana)', roman: 'Hepburn rōmaji' },
  ko: { name: 'Korean', nonLatin: true, script: 'Hangul', roman: 'Revised Romanization' },
  yue: { name: 'Cantonese', nonLatin: true, script: 'Traditional Chinese', roman: 'Jyutping' },
  ru: { name: 'Russian', nonLatin: true, script: 'Cyrillic', roman: 'Latin transliteration' },
  ar: { name: 'Arabic', nonLatin: true, script: 'Arabic script', roman: 'romanized Arabic' },
  hi: { name: 'Hindi', nonLatin: true, script: 'Devanagari', roman: 'IAST' },
  th: { name: 'Thai', nonLatin: true, script: 'Thai script', roman: 'RTGS' },
  sr: { name: 'Serbian', nonLatin: true, script: 'Cyrillic', roman: 'Serbian Latin (Gaj’s)', nativeLatin: true },
};

const LANG_ORDER = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'yue', 'ru', 'ar', 'hi', 'th', 'sr'];
const GROUP_LABEL: Record<string, string> = { allMale: 'all male', allFemale: 'all female', mixed: 'mixed' };
const GENDER_OPTS = [
  { v: 'male', label: 'Male' },
  { v: 'female', label: 'Female' },
];
const GROUP_OPTS = [
  { v: 'allMale', label: 'All male' },
  { v: 'allFemale', label: 'All female' },
  { v: 'mixed', label: 'Mixed' },
];

/** Default build mirrors the example sentence:
 *  "Reword into Japanese, romanize it. I'm male talking to a female. Copy in English." */
const INITIAL = {
  lang: 'ja',
  speaker: 'male',
  recipient: 'female',
  group: 'mixed',
  copyLang: 'en',
  on: { romanize: true, speaker: true, recipient: true, group: false, copy: true },
};

type State = typeof INITIAL;

/* ---------- text with inline marks ----------------------------------------
   Module text carries «hl» / «cmt» / «fld» marks. Rendering them as React
   nodes keeps the styling in tokens instead of raw HTML.                    */

/** Built per call: a shared /g regex would carry `lastIndex` between renders. */
const markRe = () => /«(cmt|fld|hl)»([\s\S]*?)«\/\1»/g;
const MARK_CLASS: Record<string, string> = {
  cmt: 'text-muted-foreground/70',
  fld: 'text-primary',
  hl: 'text-accent font-semibold',
};

function Marked({ text, jsonField = false }: { text: string; jsonField?: boolean }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = markRe();
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const cls = m[1] === 'fld' && jsonField ? 'text-accent' : MARK_CLASS[m[1]];
    parts.push(
      <span key={parts.length} className={cls}>
        {m[2]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ---------- derivations ---------------------------------------------------- */

const romActive = (s: State) => s.on.romanize && !!LANGS[s.lang].nonLatin;
const cotActive = (s: State) => romActive(s) && !LANGS[s.lang].nativeLatin;
const copyCoT = (s: State) => {
  const c = LANGS[s.copyLang];
  return s.on.copy && romActive(s) && !!c.nonLatin && !c.nativeLatin;
};

/** Plain-English read-back of the current build. */
function narration(s: State) {
  const L = LANGS[s.lang];
  const parts: string[] = [];
  let lead = `Reword this text into «hl»${L.name}«/hl»`;
  if (romActive(s)) lead += `, and romanize it («hl»${L.roman}«/hl»)`;
  parts.push(lead + '.');

  if (s.on.speaker && s.on.recipient) parts.push(`I'm a «hl»${s.speaker}«/hl» talking to a «hl»${s.recipient}«/hl».`);
  else if (s.on.speaker) parts.push(`I'm a «hl»${s.speaker}«/hl».`);
  else if (s.on.recipient) parts.push(`I'm talking to a «hl»${s.recipient}«/hl».`);

  if (s.on.group) {
    const g = s.group === 'mixed' ? 'a mix of men and women' : s.group === 'allMale' ? 'all men' : 'all women';
    parts.push(`It's a group chat — «hl»${g}«/hl».`);
  }
  if (s.on.copy) parts.push(`I'd also like a copy in «hl»${LANGS[s.copyLang].name}«/hl».`);
  return parts.join(' ');
}

type Row = {
  tone: 'core' | 'frag' | 'json';
  kind: string;
  title: string;
  text?: string;
  note?: string;
  json?: string[];
};

/** The field names the app parses back out of the response. */
function jsonFields(s: State) {
  const f: string[] = [];
  if (cotActive(s) && s.on.copy) f.push('native_form_reword');
  else if (cotActive(s)) f.push('native_form');
  f.push('reword');
  if (s.on.copy) {
    if (copyCoT(s)) f.push('native_form_copy');
    f.push('copy');
  }
  return f;
}

/** The rows that make up the assembled prompt, in the order they are sent. */
function cardRows(s: State): Row[] {
  const L = LANGS[s.lang];
  const rows: Row[] = [];

  let baseText = `Reword the message into ${L.name}.`;
  if (L.nonLatin && !romActive(s)) baseText += `  Use ${L.script} only.`;
  rows.push({ tone: 'core', kind: 'required', title: 'Base directive', text: baseText });

  if (romActive(s)) {
    let t = `Use ${L.roman} only — never ${L.script}.`;
    if (cotActive(s)) t += `\nFirst emit «fld»native_form«/fld» in ${L.script}, THEN transliterate.`;
    rows.push({ tone: 'frag', kind: 'module', title: 'Romanize', text: t });
  }
  if (s.on.speaker)
    rows.push({
      tone: 'frag',
      kind: 'module',
      title: 'Speaker gender',
      text: `Speaker = ${s.speaker}.  «cmt»// 1st-person agreement«/cmt»`,
    });
  if (s.on.recipient)
    rows.push({
      tone: 'frag',
      kind: 'module',
      title: 'Recipient gender',
      text: `Recipient = ${s.recipient}.  «cmt»// 2nd-person + gendered nouns«/cmt»`,
    });
  if (s.on.group)
    rows.push({
      tone: 'frag',
      kind: 'module',
      title: 'Group chat',
      text: `Group = ${GROUP_LABEL[s.group]}.  «cmt»// resolves plural “you”«/cmt»`,
    });
  if (s.on.copy)
    rows.push({
      tone: 'frag',
      kind: 'module',
      title: 'Send a copy',
      text: `Also produce a copy in ${LANGS[s.copyLang].name}.`,
    });

  rows.push({
    tone: 'core',
    kind: 'required',
    title: 'Universal constraints',
    text: 'Single target · no false cognates · no softening (nightmares ≠ dreams) · same sentence count · native vocabulary.',
  });
  rows.push({
    tone: 'json',
    kind: 'output',
    title: 'JSON Format',
    note: 'Return the result as JSON with fixed field names, so the app parses it consistently and reliably.',
    json: jsonFields(s),
  });
  return rows;
}

/* ---------- pieces --------------------------------------------------------- */

function Select({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="mt-2.5 w-full cursor-pointer rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ModuleCard({
  name,
  desc,
  state,
  onToggle,
  children,
}: {
  name: string;
  desc: string;
  /** required = always in the prompt, off/on = user's choice, na = not applicable here */
  state: 'required' | 'on' | 'off' | 'na';
  onToggle?: () => void;
  children?: React.ReactNode;
}) {
  const interactive = state === 'on' || state === 'off';
  const tone =
    state === 'required'
      ? 'border-primary/50 bg-primary/[0.07]'
      : state === 'on'
        ? 'border-accent/55 bg-accent/[0.08]'
        : state === 'na'
          ? 'border-border bg-card opacity-50'
          : 'border-border bg-card';
  const badge =
    state === 'required'
      ? 'text-primary'
      : state === 'on'
        ? 'text-accent'
        : 'text-muted-foreground';
  const badgeText = state === 'required' ? 'REQUIRED' : state === 'na' ? 'N/A' : state === 'on' ? 'ADDED' : 'ADD';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onToggle : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
      className={`rounded-xl border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone} ${
        interactive ? 'cursor-pointer hover:border-accent' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight">{name}</span>
        <span className={`ml-auto whitespace-nowrap text-[10px] font-bold tracking-wide ${badge}`}>{badgeText}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
      {children}
    </div>
  );
}

function PromptRow({ row }: { row: Row }) {
  const edge =
    row.tone === 'core' ? 'border-l-primary' : row.tone === 'frag' ? 'border-l-accent' : 'border-l-muted-foreground';
  const kind =
    row.tone === 'core'
      ? 'text-primary border-primary/40'
      : row.tone === 'frag'
        ? 'text-accent border-accent/40'
        : 'text-muted-foreground border-border';

  return (
    <div className={`rounded-xl border border-l-[3px] border-border bg-card px-3.5 py-3 ${edge}`}>
      <div className="mb-1.5 flex items-center gap-2.5">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${kind}`}>
          {row.kind}
        </span>
        <span className="text-sm font-semibold">{row.title}</span>
      </div>
      {row.note && <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{row.note}</p>}
      <div className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
        {row.json ? (
          <>
            {'{\n'}
            {row.json.map((name, i) => (
              <span key={name}>
                {'  '}
                <span className="text-accent">{`"${name}"`}</span>
                {`: "…"${i < row.json!.length - 1 ? ',' : ''}\n`}
              </span>
            ))}
            {'}'}
          </>
        ) : (
          <Marked text={row.text ?? ''} />
        )}
      </div>
    </div>
  );
}

/* ---------- the diagram ---------------------------------------------------- */

export function PromptArchitecture() {
  const [s, setS] = useState<State>(INITIAL);
  const set = (patch: Partial<State>) => setS((p) => ({ ...p, ...patch }));
  const toggle = (k: keyof State['on']) => setS((p) => ({ ...p, on: { ...p.on, [k]: !p.on[k] } }));

  const latin = !LANGS[s.lang].nonLatin;
  const rows = cardRows(s);
  const langOptions = LANG_ORDER.map((c) => ({ v: c, label: LANGS[c].name }));
  const copyOptions = LANG_ORDER.filter((c) => c !== s.lang).map((c) => ({ v: c, label: LANGS[c].name }));

  return (
    <div className="reveal mt-8">
      <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Arcatext builds every LLM call by stacking small, reusable <em>prompt modules</em>, depending on the user needs
        in the moment.
      </p>

      <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
        The LLM Prompt in Plain English
      </h4>
      <div className="mb-7 flex items-start gap-3 rounded-2xl border border-l-[3px] border-border border-l-accent bg-card p-4 sm:p-5">
        <span aria-hidden className="font-serif text-4xl leading-[0.78] text-accent">
          “
        </span>
        <p className="text-base font-medium leading-relaxed sm:text-lg">
          <Marked text={narration(s)} />
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Left: the module menu, one card per row. */}
        <div>
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="mb-3.5 flex flex-wrap items-baseline gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                User-Driven Prompt Modules
              </h4>
              <span className="text-xs text-muted-foreground/80">Click a module to add or remove it.</span>
            </div>

            <div className="grid gap-2.5">
              <ModuleCard name="Target language" desc="The language your message is reworded into." state="required">
                <Select
                  label="Target language"
                  value={s.lang}
                  options={langOptions}
                  onChange={(v) =>
                    setS((p) => ({
                      ...p,
                      lang: v,
                      on: { ...p.on, romanize: LANGS[v].nonLatin ? p.on.romanize : false },
                      copyLang: p.copyLang === v ? (v === 'en' ? 'es' : 'en') : p.copyLang,
                    }))
                  }
                />
              </ModuleCard>

              <ModuleCard
                name="Romanize"
                desc={
                  latin
                    ? 'Not needed — this language already uses the Latin alphabet.'
                    : 'Spell the result in Latin letters instead of the native script.'
                }
                state={latin ? 'na' : s.on.romanize ? 'on' : 'off'}
                onToggle={() => toggle('romanize')}
              />

              <ModuleCard
                name="Speaker gender"
                desc="Your gender, so first-person wording agrees."
                state={s.on.speaker ? 'on' : 'off'}
                onToggle={() => toggle('speaker')}
              >
                {s.on.speaker && (
                  <Select
                    label="Speaker gender"
                    value={s.speaker}
                    options={GENDER_OPTS}
                    onChange={(v) => set({ speaker: v })}
                  />
                )}
              </ModuleCard>

              <ModuleCard
                name="Recipient gender"
                desc="The reader's gender, for second-person wording."
                state={s.on.recipient ? 'on' : 'off'}
                onToggle={() => toggle('recipient')}
              >
                {s.on.recipient && (
                  <Select
                    label="Recipient gender"
                    value={s.recipient}
                    options={GENDER_OPTS}
                    onChange={(v) => set({ recipient: v })}
                  />
                )}
              </ModuleCard>

              <ModuleCard
                name="Group chat"
                desc="Handle a plural “you” when writing to a group."
                state={s.on.group ? 'on' : 'off'}
                onToggle={() => toggle('group')}
              >
                {s.on.group && (
                  <Select label="Group makeup" value={s.group} options={GROUP_OPTS} onChange={(v) => set({ group: v })} />
                )}
              </ModuleCard>

              <ModuleCard
                name="Send a copy"
                desc="Also produce the message in a second language."
                state={s.on.copy ? 'on' : 'off'}
                onToggle={() => toggle('copy')}
              >
                {s.on.copy && (
                  <Select
                    label="Copy language"
                    value={s.copyLang}
                    options={copyOptions}
                    onChange={(v) => set({ copyLang: v })}
                  />
                )}
              </ModuleCard>
            </div>
          </div>

          {/* Stacked, the connector earns its place; side by side the two
              headings already carry the relationship. */}
          <div aria-hidden className="my-4 flex items-center justify-center gap-2.5 text-muted-foreground lg:hidden">
            <span className="h-px w-11 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">assembles into</span>
            <span className="h-px w-11 bg-border" />
          </div>
        </div>

        {/* Right: the prompt those choices assemble into. */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Assembled System Prompt: Sent to LLM</span>
            <span className="ml-auto text-xs text-muted-foreground">Prompt content simplified</span>
          </div>
          <div className="flex flex-col gap-2.5 bg-background p-3.5">
            {rows.map((r) => (
              <PromptRow key={r.title} row={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
