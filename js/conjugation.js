// conjugation.js — Japanese verb conjugation engine

const G1_MASU_SUFFIX = { う:'い', く:'き', ぐ:'ぎ', す:'し', つ:'ち', ぬ:'に', ぶ:'び', む:'み', る:'り' };
const G1_NAI_SUFFIX  = { う:'わ', く:'か', ぐ:'が', す:'さ', つ:'た', ぬ:'な', ぶ:'ば', む:'ま', る:'ら' };
const G1_TA_SUFFIX   = { う:'った', く:'いた', ぐ:'いだ', す:'した', つ:'った', ぬ:'んだ', ぶ:'んだ', む:'んだ', る:'った' };

/**
 * Returns all 8 conjugation forms for a verb.
 * Each form is an object: { kanji, kana }
 */
function getConjugations(verb) {
  const { kanji, kana, group } = verb;

  if (group === 3) {
    return _group3(verb);
  }

  if (group === 2) {
    const stem_kana  = kana.slice(0, -1);
    const stem_kanji = kanji.slice(0, -1);
    return {
      plain_pres_pos:  { kanji: kanji,                        kana: kana },
      plain_pres_neg:  { kanji: stem_kanji + 'ない',           kana: stem_kana + 'ない' },
      plain_past_pos:  { kanji: stem_kanji + 'た',             kana: stem_kana + 'た' },
      plain_past_neg:  { kanji: stem_kanji + 'なかった',       kana: stem_kana + 'なかった' },
      polite_pres_pos: { kanji: stem_kanji + 'ます',           kana: stem_kana + 'ます' },
      polite_pres_neg: { kanji: stem_kanji + 'ません',         kana: stem_kana + 'ません' },
      polite_past_pos: { kanji: stem_kanji + 'ました',         kana: stem_kana + 'ました' },
      polite_past_neg: { kanji: stem_kanji + 'ませんでした',   kana: stem_kana + 'ませんでした' },
    };
  }

  // Group 1
  const last_kana   = kana.slice(-1);
  const stem_kana   = kana.slice(0, -1);
  const stem_kanji  = kanji.slice(0, -1);

  const masu_suf = G1_MASU_SUFFIX[last_kana] || '';
  const nai_suf  = G1_NAI_SUFFIX[last_kana]  || '';
  const ta_suf   = (verb.irregular && verb.irregular.ta) ? verb.irregular.ta : (G1_TA_SUFFIX[last_kana] || '');

  return {
    plain_pres_pos:  { kanji: kanji,                                  kana: kana },
    plain_pres_neg:  { kanji: stem_kanji + nai_suf + 'ない',          kana: stem_kana + nai_suf + 'ない' },
    plain_past_pos:  { kanji: stem_kanji + ta_suf,                    kana: stem_kana + ta_suf },
    plain_past_neg:  { kanji: stem_kanji + nai_suf + 'なかった',      kana: stem_kana + nai_suf + 'なかった' },
    polite_pres_pos: { kanji: stem_kanji + masu_suf + 'ます',         kana: stem_kana + masu_suf + 'ます' },
    polite_pres_neg: { kanji: stem_kanji + masu_suf + 'ません',       kana: stem_kana + masu_suf + 'ません' },
    polite_past_pos: { kanji: stem_kanji + masu_suf + 'ました',       kana: stem_kana + masu_suf + 'ました' },
    polite_past_neg: { kanji: stem_kanji + masu_suf + 'ませんでした', kana: stem_kana + masu_suf + 'ませんでした' },
  };
}

function _group3(verb) {
  const { kanji, kana } = verb;

  // 来る special case
  if (kana === 'くる') {
    return {
      plain_pres_pos:  { kanji:'来る',       kana:'くる' },
      plain_pres_neg:  { kanji:'来ない',     kana:'こない' },
      plain_past_pos:  { kanji:'来た',       kana:'きた' },
      plain_past_neg:  { kanji:'来なかった', kana:'こなかった' },
      polite_pres_pos: { kanji:'来ます',     kana:'きます' },
      polite_pres_neg: { kanji:'来ません',   kana:'きません' },
      polite_past_pos: { kanji:'来ました',   kana:'きました' },
      polite_past_neg: { kanji:'来ませんでした', kana:'きませんでした' },
    };
  }

  // する / compound する
  if (kana.endsWith('する')) {
    const kpre = kanji.slice(0, -2);
    const npre = kana.slice(0, -2);
    return {
      plain_pres_pos:  { kanji: kanji,                       kana: kana },
      plain_pres_neg:  { kanji: kpre + 'しない',             kana: npre + 'しない' },
      plain_past_pos:  { kanji: kpre + 'した',               kana: npre + 'した' },
      plain_past_neg:  { kanji: kpre + 'しなかった',         kana: npre + 'しなかった' },
      polite_pres_pos: { kanji: kpre + 'します',             kana: npre + 'します' },
      polite_pres_neg: { kanji: kpre + 'しません',           kana: npre + 'しません' },
      polite_past_pos: { kanji: kpre + 'しました',           kana: npre + 'しました' },
      polite_past_neg: { kanji: kpre + 'しませんでした',     kana: npre + 'しませんでした' },
    };
  }

  // Fallback: treat as G2
  const s_k = kanji.slice(0, -1);
  const s_n = kana.slice(0, -1);
  return {
    plain_pres_pos:  { kanji: kanji,          kana: kana },
    plain_pres_neg:  { kanji: s_k+'ない',     kana: s_n+'ない' },
    plain_past_pos:  { kanji: s_k+'た',       kana: s_n+'た' },
    plain_past_neg:  { kanji: s_k+'なかった', kana: s_n+'なかった' },
    polite_pres_pos: { kanji: s_k+'ます',     kana: s_n+'ます' },
    polite_pres_neg: { kanji: s_k+'ません',   kana: s_n+'ません' },
    polite_past_pos: { kanji: s_k+'ました',   kana: s_n+'ました' },
    polite_past_neg: { kanji: s_k+'ませんでした', kana: s_n+'ませんでした' },
  };
}

// Form display labels
const FORM_LABELS = {
  plain_pres_pos:  { ja:'現在肯定（辞書形）', zh:'現在肯定（辭書形）' },
  plain_pres_neg:  { ja:'現在否定（ない形）', zh:'現在否定（ない形）' },
  plain_past_pos:  { ja:'過去肯定（た形）',   zh:'過去肯定（た形）' },
  plain_past_neg:  { ja:'過去否定',           zh:'過去否定' },
  polite_pres_pos: { ja:'現在肯定（ます形）', zh:'現在肯定（ます形）' },
  polite_pres_neg: { ja:'現在否定（ません）', zh:'現在否定（ません）' },
  polite_past_pos: { ja:'過去肯定（ました）', zh:'過去肯定（ました）' },
  polite_past_neg: { ja:'過去否定（ませんでした）', zh:'過去否定（ませんでした）' },
};

const PLAIN_FORMS  = ['plain_pres_pos',  'plain_pres_neg',  'plain_past_pos',  'plain_past_neg'];
const POLITE_FORMS = ['polite_pres_pos', 'polite_pres_neg', 'polite_past_pos', 'polite_past_neg'];

const GROUP_NAMES = { 1:'第一類（五段動詞）', 2:'第二類（一段動詞）', 3:'第三類（不規則動詞）' };
