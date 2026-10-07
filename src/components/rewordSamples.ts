/**
 * Scripted Reword results for the prompt diagram.
 *
 * The diagram's modules are the real ones, so the demo beside it has to answer
 * like the app would: change the target language, the script, either gender or
 * the group-chat setting and the sentence has to change in the way that
 * language actually changes. Rather than one canned string per combination --
 * twelve languages times two genders times four group states is a table nobody
 * can keep honest -- each language stores only the parts that vary, and the
 * sentence is assembled from them. A language that does not inflect for
 * something simply stores one string for it, which is the true answer: the
 * output genuinely does not change.
 *
 * These translations are written here, not produced by the model, and are not
 * native-speaker reviewed.
 */

/** Speaker gender ('m' | 'f'), recipient gender, or neither. */
export type Gendered = string | { m: string; f: string };
export type Grouped = string | { allMale: string; allFemale: string; mixed: string };

interface Sample {
  /** First clause: carries SPEAKER gender in most of these languages. */
  tired: Gendered;
  /** Second clause: carries RECIPIENT gender. */
  ask: Gendered;
  /** The ask again, for a group -- plural "you", and gender of the group. */
  askGroup?: Grouped;
  /** The same three, romanized, for languages written in another script. */
  tiredRoman?: Gendered;
  askRoman?: Gendered;
  askGroupRoman?: Grouped;
}

/** The one message the demo rewords, in the language it is written in. */
export const SAMPLE_INPUT = "I'm so tired. Can you come pick me up at university?";

const SAMPLES: Record<string, Sample> = {
  en: {
    tired: "I'm so tired.",
    ask: 'Can you come pick me up at university?',
    askGroup: 'Can any of you come pick me up at university?',
  },
  es: {
    tired: { m: 'Estoy muy cansado.', f: 'Estoy muy cansada.' },
    ask: '¿Puedes venir a recogerme a la universidad?',
    askGroup: '¿Pueden venir a recogerme a la universidad?',
  },
  fr: {
    tired: { m: 'Je suis tellement fatigué.', f: 'Je suis tellement fatiguée.' },
    ask: 'Tu peux venir me chercher à la fac ?',
    askGroup: 'Vous pouvez venir me chercher à la fac ?',
  },
  de: {
    tired: 'Ich bin so müde.',
    ask: 'Kannst du mich an der Uni abholen?',
    askGroup: 'Könnt ihr mich an der Uni abholen?',
  },
  ja: {
    tired: 'すごく疲れた。',
    ask: '大学まで迎えに来てくれる？',
    askGroup: 'だれか大学まで迎えに来てくれる？',
    tiredRoman: 'Sugoku tsukareta.',
    askRoman: 'Daigaku made mukae ni kite kureru?',
    askGroupRoman: 'Dareka daigaku made mukae ni kite kureru?',
  },
  ko: {
    tired: '너무 피곤해.',
    ask: '대학교로 데리러 와 줄 수 있어?',
    askGroup: '누가 대학교로 데리러 와 줄 수 있어?',
    tiredRoman: 'Neomu pigonhae.',
    askRoman: 'Daehakgyoro derireo wa jul su isseo?',
    askGroupRoman: 'Nuga daehakgyoro derireo wa jul su isseo?',
  },
  yue: {
    tired: '我好攰啊。',
    ask: '你可唔可以嚟大學接我？',
    askGroup: '你哋邊個可以嚟大學接我？',
    tiredRoman: 'Ngo5 hou2 gui6 aa3.',
    askRoman: 'Nei5 ho2 m4 ho2 ji5 lai4 daai6 hok6 zip3 ngo5?',
    askGroupRoman: 'Nei5 dei6 bin1 go3 ho2 ji5 lai4 daai6 hok6 zip3 ngo5?',
  },
  ru: {
    tired: { m: 'Я так устал.', f: 'Я так устала.' },
    ask: 'Можешь забрать меня из университета?',
    askGroup: 'Можете забрать меня из университета?',
    tiredRoman: { m: 'Ya tak ustal.', f: 'Ya tak ustala.' },
    askRoman: 'Mozhesh zabrat menya iz universiteta?',
    askGroupRoman: 'Mozhete zabrat menya iz universiteta?',
  },
  ar: {
    tired: { m: 'أنا متعب جداً.', f: 'أنا متعبة جداً.' },
    ask: {
      m: 'هل يمكنك أن تأتي لتقلّني من الجامعة؟',
      f: 'هل يمكنكِ أن تأتي لتقلّيني من الجامعة؟',
    },
    askGroup: {
      allMale: 'هل يمكنكم أن تأتوا لتقلّوني من الجامعة؟',
      allFemale: 'هل يمكنكنّ أن تأتين لتقلّنني من الجامعة؟',
      mixed: 'هل يمكنكم أن تأتوا لتقلّوني من الجامعة؟',
    },
    tiredRoman: { m: 'Ana mutʿab jiddan.', f: 'Ana mutʿaba jiddan.' },
    askRoman: {
      m: 'Hal yumkinuka an taʾtiya li-tuqillani min al-jamiʿa?',
      f: 'Hal yumkinuki an taʾtiya li-tuqillini min al-jamiʿa?',
    },
    askGroupRoman: {
      allMale: 'Hal yumkinukum an taʾtu li-tuqilluni min al-jamiʿa?',
      allFemale: 'Hal yumkinukunna an taʾtina li-tuqilnani min al-jamiʿa?',
      mixed: 'Hal yumkinukum an taʾtu li-tuqilluni min al-jamiʿa?',
    },
  },
  hi: {
    tired: { m: 'मैं बहुत थका हुआ हूँ।', f: 'मैं बहुत थकी हुई हूँ।' },
    ask: {
      m: 'क्या तुम मुझे यूनिवर्सिटी से लेने आ सकते हो?',
      f: 'क्या तुम मुझे यूनिवर्सिटी से लेने आ सकती हो?',
    },
    askGroup: 'क्या तुम लोग मुझे यूनिवर्सिटी से लेने आ सकते हो?',
    tiredRoman: { m: 'Maiṁ bahut thakā huā hūṁ.', f: 'Maiṁ bahut thakī huī hūṁ.' },
    askRoman: {
      m: 'Kyā tum mujhe yūnivarsiṭī se lene ā sakte ho?',
      f: 'Kyā tum mujhe yūnivarsiṭī se lene ā saktī ho?',
    },
    askGroupRoman: 'Kyā tum log mujhe yūnivarsiṭī se lene ā sakte ho?',
  },
  th: {
    /* Thai marks the speaker, not the listener: the polite particle differs. */
    tired: { m: 'เหนื่อยมากเลยครับ', f: 'เหนื่อยมากเลยค่ะ' },
    ask: { m: 'มารับที่มหาวิทยาลัยได้ไหมครับ', f: 'มารับที่มหาวิทยาลัยได้ไหมคะ' },
    tiredRoman: { m: 'Nueai mak loei khrap', f: 'Nueai mak loei kha' },
    askRoman: {
      m: 'Ma rap thi mahawitthayalai dai mai khrap',
      f: 'Ma rap thi mahawitthayalai dai mai kha',
    },
  },
  sr: {
    tired: { m: 'Тако сам уморан.', f: 'Тако сам уморна.' },
    ask: 'Можеш ли да дођеш по мене на факултет?',
    askGroup: 'Можете ли да дођете по мене на факултет?',
    tiredRoman: { m: 'Tako sam umoran.', f: 'Tako sam umorna.' },
    askRoman: 'Možeš li da dođeš po mene na fakultet?',
    askGroupRoman: 'Možete li da dođete po mene na fakultet?',
  },
};

export interface SampleQuery {
  lang: string;
  /** Null when the module is off: the unmarked form is used. */
  speaker: 'm' | 'f' | null;
  recipient: 'm' | 'f' | null;
  group: 'allMale' | 'allFemale' | 'mixed' | null;
  romanized: boolean;
}

const pickG = (v: Gendered | undefined, g: 'm' | 'f' | null): string | undefined =>
  typeof v === 'string' ? v : v ? v[g ?? 'm'] : undefined;

const pickGroup = (v: Grouped | undefined, g: SampleQuery['group']): string | undefined =>
  typeof v === 'string' ? v : v ? v[g ?? 'mixed'] : undefined;

/**
 * The sentence for one set of selections, or null for a language with no
 * script written for it yet (the caller then says so rather than inventing).
 */
export function rewordSample(q: SampleQuery): string | null {
  const s = SAMPLES[q.lang];
  if (!s) return null;

  const roman = q.romanized;
  const tired = (roman ? pickG(s.tiredRoman, q.speaker) : undefined) ?? pickG(s.tired, q.speaker);
  /* In a group chat the app drops the recipient's gender for the group's, so
     the group line replaces the one-to-one ask entirely. */
  const ask = q.group
    ? (roman ? pickGroup(s.askGroupRoman, q.group) : undefined) ??
      pickGroup(s.askGroup, q.group) ??
      (roman ? pickG(s.askRoman, q.recipient) : undefined) ??
      pickG(s.ask, q.recipient)
    : (roman ? pickG(s.askRoman, q.recipient) : undefined) ?? pickG(s.ask, q.recipient);

  if (!tired || !ask) return null;
  return `${tired} ${ask}`;
}
