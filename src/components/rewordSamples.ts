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
  recipient: 'Are you the one coming to get me?',
  group: 'Are you the ones coming to get me?',
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
    recipient: { m: '¿Eres tú el que viene a recogerme?', f: '¿Eres tú la que viene a recogerme?' },
    group: {
      allMale: '¿Son ustedes los que vienen a recogerme?',
      allFemale: '¿Son ustedes las que vienen a recogerme?',
      mixed: '¿Son ustedes los que vienen a recogerme?',
    },
  },
  fr: {
    base: "Le cours s'est éternisé.",
    speaker: { m: 'Je suis épuisé.', f: 'Je suis épuisée.' },
    recipient: {
      m: 'Tu es celui qui vient me chercher ?',
      f: 'Tu es celle qui vient me chercher ?',
    },
    group: {
      allMale: 'Vous êtes ceux qui venez me chercher ?',
      allFemale: 'Vous êtes celles qui venez me chercher ?',
      mixed: 'Vous êtes ceux qui venez me chercher ?',
    },
  },
  de: {
    base: 'Die Vorlesung hat ewig gedauert.',
    speaker: 'Ich bin total erschöpft.',
    recipient: {
      m: 'Bist du derjenige, der mich abholt?',
      f: 'Bist du diejenige, die mich abholt?',
    },
    /* German does not gender a plural "you", so the group's makeup changes
       nothing here -- one string is the honest answer. */
    group: 'Seid ihr diejenigen, die mich abholen?',
  },
  ja: {
    base: '講義が長引いた。',
    /* Japanese marks the speaker in the first-person pronoun, not in any
       agreement, which is the only gender the app claims for it. */
    speaker: { m: '僕はもうくたくただ。', f: '私はもうくたくた。' },
    recipient: '迎えに来られる？',
    group: 'だれか迎えに来られる？',
    baseRoman: 'Kōgi ga nagabiita.',
    speakerRoman: { m: 'Boku wa mō kutakuta da.', f: 'Watashi wa mō kutakuta.' },
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
    recipient: { m: 'Ты тот, кто меня заберёт?', f: 'Ты та, кто меня заберёт?' },
    /* Russian does not gender a plural "you" here. */
    group: 'Вы те, кто меня заберёт?',
    baseRoman: 'Lektsiya zatyanulas.',
    speakerRoman: { m: 'Ya sovershenno vymotalsya.', f: 'Ya sovershenno vymotalas.' },
    recipientRoman: { m: 'Ty tot, kto menya zaberyot?', f: 'Ty ta, kto menya zaberyot?' },
    groupRoman: 'Vy te, kto menya zaberyot?',
  },
  ar: {
    base: 'المحاضرة طالت.',
    speaker: { m: 'أنا منهك تماماً.', f: 'أنا منهكة تماماً.' },
    recipient: { m: 'هل أنتَ من سيأتي ليقلّني؟', f: 'هل أنتِ من ستأتي لتقلّني؟' },
    group: {
      allMale: 'هل أنتم من ستأتون لتقلّوني؟',
      allFemale: 'هل أنتنّ من ستأتين لتقلّنني؟',
      mixed: 'هل أنتم من ستأتون لتقلّوني؟',
    },
    baseRoman: 'Al-muḥāḍara ṭālat.',
    speakerRoman: { m: 'Ana munhak tamāman.', f: 'Ana munhaka tamāman.' },
    recipientRoman: {
      m: 'Hal anta man sayaʾti li-yuqillani?',
      f: 'Hal anti man sataʾti li-tuqillani?',
    },
    groupRoman: {
      allMale: 'Hal antum man sataʾtūn li-tuqilluni?',
      allFemale: 'Hal antunna man sataʾtīna li-tuqilnani?',
      mixed: 'Hal antum man sataʾtūn li-tuqilluni?',
    },
  },
  hi: {
    base: 'लेक्चर लंबा चला।',
    speaker: 'मैं पूरी तरह थक गया हूँ।',
    recipient: {
      m: 'क्या तुम वही हो जो मुझे लेने आओगे?',
      f: 'क्या तुम वही हो जो मुझे लेने आओगी?',
    },
    group: 'क्या तुम लोग मुझे लेने आओगे?',
    baseRoman: 'Lekchar lambā chalā.',
    speakerRoman: 'Maiṁ pūrī tarah thak gayā hūṁ.',
    recipientRoman: {
      m: 'Kyā tum vahī ho jo mujhe lene āoge?',
      f: 'Kyā tum vahī ho jo mujhe lene āogī?',
    },
    groupRoman: 'Kyā tum log mujhe lene āoge?',
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
    speaker: 'Потпуно сам исцрпљен.',
    recipient: {
      m: 'Јеси ли ти тај који долази по мене?',
      f: 'Јеси ли ти та која долази по мене?',
    },
    group: 'Јесте ли ви ти који долазе по мене?',
    baseRoman: 'Predavanje se odužilo.',
    speakerRoman: 'Potpuno sam iscrpljen.',
    recipientRoman: {
      m: 'Jesi li ti taj koji dolazi po mene?',
      f: 'Jesi li ti ta koja dolazi po mene?',
    },
    groupRoman: 'Jeste li vi ti koji dolaze po mene?',
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
