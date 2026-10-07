/**
 * Scripted Reword material for the prompt diagram.
 *
 * The message is not fixed: it is built from one clause per module that is
 * switched on, and each clause is chosen because the languages here inflect it
 * for exactly that module. Turn on speaker gender and the message gains a word
 * that agrees with the speaker; turn on recipient gender and it gains one that
 * agrees with the listener; turn on group chat and the address becomes plural.
 * So the setting is visible in the input, not only in the result.
 *
 * Two modules change the result rather than the message, and are demonstrated
 * there: Romanize switches the script the answer comes back in, and Send a
 * copy adds the copy field.
 *
 * Each language stores only the clauses that vary for it. Where a language
 * does not inflect for a module it stores one string, and the output honestly
 * does not change -- Spanish marks the speaker in "agotado/agotada" but not
 * the listener in "¿estás libre?".
 *
 * These translations are written here, not produced by the model, and are not
 * native-speaker reviewed.
 */

/** Varies by speaker or recipient gender ('m' | 'f'), or does not vary. */
export type Gendered = string | { m: string; f: string };
export type Grouped = string | { allMale: string; allFemale: string; mixed: string };

interface Sample {
  /** Always present. Carries no gender, so an unset module shows nothing. */
  base: string;
  /** Added by the speaker-gender module: agrees with the writer. */
  speaker: Gendered;
  /** Added by the recipient-gender module: agrees with the person addressed. */
  recipient: Gendered;
  /** Replaces `recipient` under group chat: plural "you", and the group's gender. */
  group: Grouped;
  baseRoman?: string;
  speakerRoman?: Gendered;
  recipientRoman?: Gendered;
  groupRoman?: Grouped;
}

/** The clauses in the language the message is written in, before rewording. */
export const INPUT_CLAUSES = {
  base: 'The lecture ran long.',
  speaker: "I'm completely exhausted.",
  recipient: 'Are you free to come pick me up?',
  group: 'Are you all free to come pick me up?',
};

const SAMPLES: Record<string, Sample> = {
  en: {
    base: INPUT_CLAUSES.base,
    speaker: INPUT_CLAUSES.speaker,
    recipient: INPUT_CLAUSES.recipient,
    group: INPUT_CLAUSES.group,
  },
  es: {
    base: 'La clase se alargó.',
    speaker: { m: 'Estoy agotado.', f: 'Estoy agotada.' },
    recipient: '¿Estás libre para venir a recogerme?',
    group: '¿Están libres para venir a recogerme?',
  },
  fr: {
    base: "Le cours s'est éternisé.",
    speaker: { m: 'Je suis épuisé.', f: 'Je suis épuisée.' },
    recipient: 'Tu es libre pour venir me chercher ?',
    group: 'Vous êtes libres pour venir me chercher ?',
  },
  de: {
    base: 'Die Vorlesung hat ewig gedauert.',
    speaker: 'Ich bin total erschöpft.',
    recipient: 'Hast du Zeit, mich abzuholen?',
    group: 'Habt ihr Zeit, mich abzuholen?',
  },
  ja: {
    base: '講義が長引いた。',
    speaker: 'もうくたくた。',
    recipient: '迎えに来られる？',
    group: 'だれか迎えに来られる？',
    baseRoman: 'Kōgi ga nagabiita.',
    speakerRoman: 'Mō kutakuta.',
    recipientRoman: 'Mukae ni korareru?',
    groupRoman: 'Dareka mukae ni korareru?',
  },
  ko: {
    base: '강의가 길어졌어.',
    speaker: '완전 지쳤어.',
    recipient: '데리러 올 수 있어?',
    group: '누가 데리러 올 수 있어?',
    baseRoman: 'Gang-uiga gireojeosseo.',
    speakerRoman: 'Wanjeon jichyeosseo.',
    recipientRoman: 'Derireo ol su isseo?',
    groupRoman: 'Nuga derireo ol su isseo?',
  },
  yue: {
    base: '堂課拖咗好耐。',
    speaker: '我攰到死。',
    recipient: '你得唔得閒嚟接我？',
    group: '你哋邊個得閒嚟接我？',
    baseRoman: 'Tong4 fo3 to1 zo2 hou2 noi6.',
    speakerRoman: 'Ngo5 gui6 dou3 sei2.',
    recipientRoman: 'Nei5 dak1 m4 dak1 haan4 lai4 zip3 ngo5?',
    groupRoman: 'Nei5 dei6 bin1 go3 dak1 haan4 lai4 zip3 ngo5?',
  },
  ru: {
    base: 'Лекция затянулась.',
    speaker: { m: 'Я совершенно вымотался.', f: 'Я совершенно вымоталась.' },
    recipient: { m: 'Ты свободен, чтобы забрать меня?', f: 'Ты свободна, чтобы забрать меня?' },
    group: 'Вы свободны, чтобы забрать меня?',
    baseRoman: 'Lektsiya zatyanulas.',
    speakerRoman: { m: 'Ya sovershenno vymotalsya.', f: 'Ya sovershenno vymotalas.' },
    recipientRoman: {
      m: 'Ty svoboden, chtoby zabrat menya?',
      f: 'Ty svobodna, chtoby zabrat menya?',
    },
    groupRoman: 'Vy svobodny, chtoby zabrat menya?',
  },
  ar: {
    base: 'المحاضرة طالت.',
    speaker: { m: 'أنا منهك تماماً.', f: 'أنا منهكة تماماً.' },
    recipient: { m: 'هل أنتَ متفرّغ لتقلّني؟', f: 'هل أنتِ متفرّغة لتقلّيني؟' },
    group: {
      allMale: 'هل أنتم متفرّغون لتقلّوني؟',
      allFemale: 'هل أنتنّ متفرّغات لتقلّنني؟',
      mixed: 'هل أنتم متفرّغون لتقلّوني؟',
    },
    baseRoman: 'Al-muḥāḍara ṭālat.',
    speakerRoman: { m: 'Ana munhak tamāman.', f: 'Ana munhaka tamāman.' },
    recipientRoman: {
      m: 'Hal anta mutafarrigh li-tuqillani?',
      f: 'Hal anti mutafarrigha li-tuqillini?',
    },
    groupRoman: {
      allMale: 'Hal antum mutafarrighūn li-tuqilluni?',
      allFemale: 'Hal antunna mutafarrighāt li-tuqilnani?',
      mixed: 'Hal antum mutafarrighūn li-tuqilluni?',
    },
  },
  hi: {
    base: 'लेक्चर लंबा चला।',
    speaker: { m: 'मैं पूरी तरह थक गया हूँ।', f: 'मैं पूरी तरह थक गई हूँ।' },
    recipient: {
      m: 'क्या तुम मुझे लेने आ सकते हो?',
      f: 'क्या तुम मुझे लेने आ सकती हो?',
    },
    group: 'क्या तुम लोग मुझे लेने आ सकते हो?',
    baseRoman: 'Lekchar lambā chalā.',
    speakerRoman: { m: 'Maiṁ pūrī tarah thak gayā hūṁ.', f: 'Maiṁ pūrī tarah thak gaī hūṁ.' },
    recipientRoman: {
      m: 'Kyā tum mujhe lene ā sakte ho?',
      f: 'Kyā tum mujhe lene ā saktī ho?',
    },
    groupRoman: 'Kyā tum log mujhe lene ā sakte ho?',
  },
  th: {
    /* Thai marks the speaker, in both the pronoun and the polite particle, and
       leaves the listener unmarked. */
    base: 'เลคเชอร์ยาวมาก',
    speaker: { m: 'ผมเหนื่อยมากเลยครับ', f: 'ฉันเหนื่อยมากเลยค่ะ' },
    recipient: 'ว่างมารับได้ไหม',
    group: 'พวกคุณว่างมารับได้ไหม',
    baseRoman: 'Lekchoe yao mak',
    speakerRoman: { m: 'Phom nueai mak loei khrap', f: 'Chan nueai mak loei kha' },
    recipientRoman: 'Wang ma rap dai mai',
    groupRoman: 'Phuak khun wang ma rap dai mai',
  },
  sr: {
    base: 'Предавање се одужило.',
    speaker: { m: 'Потпуно сам исцрпљен.', f: 'Потпуно сам исцрпљена.' },
    recipient: {
      m: 'Јеси ли слободан да дођеш по мене?',
      f: 'Јеси ли слободна да дођеш по мене?',
    },
    group: 'Јесте ли слободни да дођете по мене?',
    baseRoman: 'Predavanje se odužilo.',
    speakerRoman: { m: 'Potpuno sam iscrpljen.', f: 'Potpuno sam iscrpljena.' },
    recipientRoman: {
      m: 'Jesi li slobodan da dođeš po mene?',
      f: 'Jesi li slobodna da dođeš po mene?',
    },
    groupRoman: 'Jeste li slobodni da dođete po mene?',
  },
};

export interface SampleQuery {
  lang: string;
  /** Null when the module is off: that clause is left out of the message. */
  speaker: 'm' | 'f' | null;
  recipient: 'm' | 'f' | null;
  group: 'allMale' | 'allFemale' | 'mixed' | null;
  romanized: boolean;
}

const pickG = (v: Gendered | undefined, g: 'm' | 'f' | null): string | undefined =>
  typeof v === 'string' ? v : v ? v[g ?? 'm'] : undefined;

const pickGroup = (v: Grouped | undefined, g: SampleQuery['group']): string | undefined =>
  typeof v === 'string' ? v : v ? v[g ?? 'mixed'] : undefined;

/** The English message for these settings -- one clause per module that is on. */
export function sampleInput(q: Pick<SampleQuery, 'speaker' | 'recipient' | 'group'>): string {
  const parts = [INPUT_CLAUSES.base];
  if (q.speaker) parts.push(INPUT_CLAUSES.speaker);
  if (q.group) parts.push(INPUT_CLAUSES.group);
  else if (q.recipient) parts.push(INPUT_CLAUSES.recipient);
  return parts.join(' ');
}

/**
 * The same message in the target language, or null for a language with no
 * script written for it (the caller then says so rather than inventing one).
 */
export function rewordSample(q: SampleQuery): string | null {
  const s = SAMPLES[q.lang];
  if (!s) return null;
  const r = q.romanized;

  const parts: string[] = [(r ? s.baseRoman : undefined) ?? s.base];
  if (q.speaker) {
    const v = (r ? pickG(s.speakerRoman, q.speaker) : undefined) ?? pickG(s.speaker, q.speaker);
    if (v) parts.push(v);
  }
  /* Group chat replaces the one-to-one address: the app drops the recipient's
     gender for the group's, and so does the sentence. */
  if (q.group) {
    const v = (r ? pickGroup(s.groupRoman, q.group) : undefined) ?? pickGroup(s.group, q.group);
    if (v) parts.push(v);
  } else if (q.recipient) {
    const v =
      (r ? pickG(s.recipientRoman, q.recipient) : undefined) ?? pickG(s.recipient, q.recipient);
    if (v) parts.push(v);
  }
  return parts.join(' ');
}
