const dict = {
  en: {
    summary: 'Professional Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    contact: 'Contact'
  },
  es: {
    summary: 'Resumen Profesional',
    experience: 'Experiencia',
    education: 'Educación',
    skills: 'Habilidades',
    contact: 'Contacto'
  },
  fr: {
    summary: 'Résumé Professionnel',
    experience: 'Expérience',
    education: 'Éducation',
    skills: 'Compétences',
    contact: 'Contact'
  },
  de: {
    summary: 'Berufliches Profil',
    experience: 'Berufserfahrung',
    education: 'Ausbildung',
    skills: 'Fähigkeiten',
    contact: 'Kontakt'
  }
}

export function t(lang = 'en', key) {
  const table = dict[lang] || dict.en
  return table[key] || key
}
