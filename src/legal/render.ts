import type { AppLanguage } from '../i18n';
import config from './config.json';
import content from './content.json';

export type LegalKind = 'privacy' | 'terms' | 'deletion';

export type LegalSection = { h: string; p?: string[]; ul?: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

const values: Record<string, string> = {
  appName: config.appName,
  owner: config.owner,
  address: config.address,
  contactEmail: config.contactEmail,
  jurisdiction: config.jurisdiction,
  dataRegion: config.dataRegion,
  minAge: config.minAge,
};

function fill(text: string, language: AppLanguage) {
  const all = { ...values, lastUpdated: config.lastUpdated[language] ?? config.lastUpdated.es };
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => all[key as keyof typeof all] ?? '');
}

/** Documento legal con los datos del titular insertados, en el idioma pedido (español si no existe). */
export function getLegalDoc(kind: LegalKind, language: AppLanguage): LegalDoc {
  const docs = content[kind] as Record<string, LegalDoc>;
  const doc = docs[language] ?? docs.es;
  const lang = docs[language] ? language : 'es';
  return {
    title: fill(doc.title, lang),
    intro: fill(doc.intro, lang),
    sections: doc.sections.map((section) => ({
      h: fill(section.h, lang),
      p: section.p?.map((text) => fill(text, lang)),
      ul: section.ul?.map((text) => fill(text, lang)),
    })),
  };
}
