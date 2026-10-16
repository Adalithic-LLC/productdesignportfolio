/**
 * The "Try it out!" prototype's script: one message to type, one message
 * received, and what Arcatext returns for them in each language it offers.
 *
 * The prototype has no model behind it, so every answer is written out here.
 * Languages, script choices and which options each language has come from the
 * app's Arcatext/Data/LanguageData.swift (main); the translations are written
 * for this conversation.
 */

/** What any key tap types, one character at a time. */
export const MESSAGE = 'I know, we have to plan another trip!';
/** Already in the chat when the prototype opens. */
export const RECEIVED = 'Last weekend at the beach was so great!';

export type Script = { title: string; subtitle: string; rtl?: boolean };

/** One script's worth of output. */
type Out = {
  reword: string;
  /** The received message, translated in Paste. */
  received: string;
  synonyms: string[];
  /** The two meanings of "trip": a journey (in use) and a stumble. */
  trip: [string, string];
};

export type Lang = {
  name: string;
  /** Script choices, as the Options page lists them; absent = native only. */
  scripts?: Script[];
  recipientGender?: boolean;
  groupChat?: boolean;
  speakerGender?: boolean;
  /** Reverse translation: what Check reads the reword back as. */
  reverse: string;
  /** Output per script title (or 'default' for a language with none). */
  out: Record<string, Out>;
};

const ROMAN: Script = { title: 'Romanized', subtitle: 'ABC' };

export const LANGS: Lang[] = [
  {
    name: 'English',
    reverse: MESSAGE,
    out: {
      default: {
        reword: MESSAGE,
        received: RECEIVED,
        synonyms: ['I know, we need to plan another trip!', 'I know, we should plan another trip!', 'I know, we have to plan our next trip!'],
        trip: ['trip', 'stumble'],
      },
    },
  },
  {
    name: 'Spanish',
    recipientGender: true,
    groupChat: true,
    speakerGender: true,
    reverse: 'I know, we have to plan another trip!',
    out: {
      default: {
        reword: '¡Lo sé, tenemos que planear otro viaje!',
        received: '¡El fin de semana pasado en la playa fue genial!',
        synonyms: ['¡Ya lo sé, tenemos que organizar otro viaje!', '¡Lo sé, hay que planear otro viaje!', '¡Claro, tenemos que planificar otro viaje!'],
        trip: ['viaje', 'tropiezo'],
      },
    },
  },
  {
    name: 'French',
    recipientGender: true,
    groupChat: true,
    speakerGender: true,
    reverse: 'I know, we need to plan another trip!',
    out: {
      default: {
        reword: "Je sais, il faut qu'on planifie un autre voyage !",
        received: "Le week-end dernier à la plage, c'était vraiment génial !",
        synonyms: ['Je sais, on doit organiser un autre voyage !', 'Je sais, il faut prévoir un nouveau voyage !', 'Je sais, nous devons planifier un autre voyage !'],
        trip: ['voyage', 'faux pas'],
      },
    },
  },
  {
    name: 'German',
    recipientGender: true,
    groupChat: true,
    reverse: 'I know, we have to plan another trip!',
    out: {
      default: {
        reword: 'Ich weiß, wir müssen noch eine Reise planen!',
        received: 'Das letzte Wochenende am Strand war so toll!',
        synonyms: ['Ich weiß, wir sollten noch eine Reise planen!', 'Ich weiß, wir müssen eine weitere Reise planen!', 'Klar, wir müssen noch einen Ausflug planen!'],
        trip: ['Reise', 'Stolpern'],
      },
    },
  },
  {
    name: 'Italian',
    recipientGender: true,
    groupChat: true,
    speakerGender: true,
    reverse: 'I know, we have to organize another trip!',
    out: {
      default: {
        reword: 'Lo so, dobbiamo organizzare un altro viaggio!',
        received: 'Lo scorso fine settimana al mare è stato bellissimo!',
        synonyms: ['Lo so, dobbiamo pianificare un altro viaggio!', 'Lo so, bisogna organizzare un altro viaggio!', 'Già, dobbiamo programmare un altro viaggio!'],
        trip: ['viaggio', 'inciampo'],
      },
    },
  },
  {
    name: 'Portuguese',
    recipientGender: true,
    groupChat: true,
    speakerGender: true,
    reverse: 'I know, we have to plan another trip!',
    out: {
      default: {
        reword: 'Eu sei, temos que planejar outra viagem!',
        received: 'O último fim de semana na praia foi tão bom!',
        synonyms: ['Eu sei, precisamos planejar outra viagem!', 'Eu sei, temos que organizar outra viagem!', 'Pois é, temos que marcar outra viagem!'],
        trip: ['viagem', 'tropeço'],
      },
    },
  },
  {
    name: 'Japanese',
    speakerGender: true,
    scripts: [
      { title: 'Standard', subtitle: 'Kanji / Hiragana / Katakana' },
      { title: 'No Kanji', subtitle: 'Hiragana / Katakana' },
      ROMAN,
    ],
    reverse: 'I know, we have to make plans for another trip!',
    out: {
      Standard: {
        reword: 'わかってる、また旅行の計画を立てないとね！',
        received: '先週末のビーチ、本当に最高だったね！',
        synonyms: ['そうだね、また旅行を計画しなきゃ！', 'わかってるよ、次の旅行の計画を立てよう！', 'うん、また旅行の予定を立てないと！'],
        trip: ['旅行', 'つまずき'],
      },
      'No Kanji': {
        reword: 'わかってる、またりょこうのけいかくをたてないとね！',
        received: 'せんしゅうまつのビーチ、ほんとうにさいこうだったね！',
        synonyms: ['そうだね、またりょこうをけいかくしなきゃ！', 'わかってるよ、つぎのりょこうのけいかくをたてよう！', 'うん、またりょこうのよていをたてないと！'],
        trip: ['りょこう', 'つまずき'],
      },
      Romanized: {
        reword: 'Wakatteru, mata ryokō no keikaku o tatenai to ne!',
        received: 'Senshūmatsu no bīchi, hontō ni saikō datta ne!',
        synonyms: ['Sō da ne, mata ryokō o keikaku shinakya!', 'Wakatteru yo, tsugi no ryokō no keikaku o tateyō!', 'Un, mata ryokō no yotei o tatenai to!'],
        trip: ['ryokō', 'tsumazuki'],
      },
    },
  },
  {
    name: 'Mandarin',
    scripts: [{ title: '简化字', subtitle: 'Jiǎnhuàzì' }, ROMAN],
    reverse: 'I know, we need to plan another trip!',
    out: {
      简化字: {
        reword: '我知道，我们得再计划一次旅行！',
        received: '上个周末在海边真是太棒了！',
        synonyms: ['我知道，我们该再安排一次旅行了！', '我明白，我们得再规划一趟旅行！', '没错，我们得再计划一次出游！'],
        trip: ['旅行', '绊倒'],
      },
      Romanized: {
        reword: 'Wǒ zhīdào, wǒmen děi zài jìhuà yí cì lǚxíng!',
        received: 'Shàng gè zhōumò zài hǎibiān zhēn shì tài bàng le!',
        synonyms: ['Wǒ zhīdào, wǒmen gāi zài ānpái yí cì lǚxíng le!', 'Wǒ míngbai, wǒmen děi zài guīhuà yí tàng lǚxíng!', 'Méicuò, wǒmen děi zài jìhuà yí cì chūyóu!'],
        trip: ['lǚxíng', 'bàndǎo'],
      },
    },
  },
  {
    name: 'Korean',
    scripts: [{ title: '한글', subtitle: 'Hangeul' }, ROMAN],
    reverse: 'I know, we have to plan another trip!',
    out: {
      한글: {
        reword: '알아, 우리 여행 또 계획해야 해!',
        received: '지난 주말 해변에서 정말 좋았어!',
        synonyms: ['맞아, 우리 또 여행 계획 세워야 해!', '알아, 다음 여행도 계획해야지!', '그러게, 우리 여행 한 번 더 가야 해!'],
        trip: ['여행', '헛디딤'],
      },
      Romanized: {
        reword: 'Ara, uri yeohaeng tto gyehoekhaeya hae!',
        received: 'Jinan jumal haebyeoneseo jeongmal joasseo!',
        synonyms: ['Maja, uri tto yeohaeng gyehoek sewoya hae!', 'Ara, daeum yeohaengdo gyehoekhaeyaji!', 'Geureoge, uri yeohaeng han beon deo gaya hae!'],
        trip: ['yeohaeng', 'heotdidim'],
      },
    },
  },
  {
    name: 'Arabic',
    recipientGender: true,
    groupChat: true,
    speakerGender: true,
    scripts: [{ title: 'الأبجدية العربية', subtitle: 'Al-Abjadiyah Al-ʿArabīyah', rtl: true }, ROMAN],
    reverse: 'I know, we have to plan another trip!',
    out: {
      'الأبجدية العربية': {
        reword: 'أعرف، علينا أن نخطط لرحلة أخرى!',
        received: 'عطلة نهاية الأسبوع الماضية على الشاطئ كانت رائعة جدًا!',
        synonyms: ['أعلم، يجب أن نخطط لرحلة جديدة!', 'أعرف، لازم نرتب لرحلة ثانية!', 'صحيح، علينا التخطيط لرحلة أخرى!'],
        trip: ['رحلة', 'تعثّر'],
      },
      Romanized: {
        reword: 'Aʿrif, ʿalaynā an nukhaṭṭiṭ li-riḥla ukhrā!',
        received: 'ʿUṭlat nihāyat al-usbūʿ al-māḍiya ʿalā ash-shāṭiʾ kānat rāʾiʿa jiddan!',
        synonyms: ['Aʿlam, yajib an nukhaṭṭiṭ li-riḥla jadīda!', 'Aʿrif, lāzim nrattib li-riḥla thānya!', 'Ṣaḥīḥ, ʿalaynā at-takhṭīṭ li-riḥla ukhrā!'],
        trip: ['riḥla', 'taʿaththur'],
      },
    },
  },
  {
    name: 'Russian',
    recipientGender: true,
    groupChat: true,
    speakerGender: true,
    scripts: [{ title: 'Русский алфавит', subtitle: 'Russkiy Alfavit' }, ROMAN],
    reverse: 'I know, we need to plan another trip!',
    out: {
      'Русский алфавит': {
        reword: 'Знаю, нам нужно спланировать ещё одну поездку!',
        received: 'Прошлые выходные на пляже были просто супер!',
        synonyms: ['Знаю, надо запланировать ещё одну поездку!', 'Я знаю, нам пора спланировать новую поездку!', 'Да, нам нужно организовать ещё одну поездку!'],
        trip: ['поездка', 'спотыкание'],
      },
      Romanized: {
        reword: "Znayu, nam nuzhno splanirovat' yeshchyo odnu poyezdku!",
        received: "Proshlyye vykhodnyye na plyazhe byli prosto super!",
        synonyms: ["Znayu, nado zaplanirovat' yeshchyo odnu poyezdku!", "Ya znayu, nam pora splanirovat' novuyu poyezdku!", "Da, nam nuzhno organizovat' yeshchyo odnu poyezdku!"],
        trip: ['poyezdka', "spotykaniye"],
      },
    },
  },
  {
    name: 'Hindi',
    recipientGender: true,
    groupChat: true,
    scripts: [{ title: 'देवनागरी', subtitle: 'Devanāgarī' }, ROMAN],
    reverse: 'I know, we have to plan another trip!',
    out: {
      देवनागरी: {
        reword: 'मुझे पता है, हमें एक और ट्रिप प्लान करनी होगी!',
        received: 'पिछला वीकेंड बीच पर बहुत ही शानदार था!',
        synonyms: ['मुझे पता है, हमें एक और यात्रा की योजना बनानी होगी!', 'हाँ, हमें फिर से कहीं घूमने का प्लान बनाना होगा!', 'पता है, हमें अगली ट्रिप प्लान करनी चाहिए!'],
        trip: ['यात्रा', 'ठोकर'],
      },
      Romanized: {
        reword: 'Mujhe pata hai, hamein ek aur trip plan karni hogi!',
        received: 'Pichhla weekend beach par bahut hi shaandaar tha!',
        synonyms: ['Mujhe pata hai, hamein ek aur yatra ki yojana banani hogi!', 'Haan, hamein phir se kahin ghoomne ka plan banana hoga!', 'Pata hai, hamein agli trip plan karni chahiye!'],
        trip: ['yatra', 'thokar'],
      },
    },
  },
];

export function findLang(name: string): Lang {
  return LANGS.find((l) => l.name === name) ?? LANGS[1];
}

/** The output for a language in a script (its first script when unset). */
export function outFor(lang: Lang, script?: string): Out {
  const key = lang.scripts ? (script && lang.out[script] ? script : lang.scripts[0].title) : 'default';
  return lang.out[key];
}

/** English glosses of "trip"'s two meanings, for the homograph cards. */
export const TRIP_GLOSSES: [string, string] = ['a journey to a place;', 'a stumble or misstep;'];
