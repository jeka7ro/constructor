import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ro from './ro.json'
import en from './en.json'
import de from './de.json'
import fr from './fr.json'
import hu from './hu.json'
import nl from './nl.json'
import ru from './ru.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ro: { translation: ro },
            en: { translation: en },
            de: { translation: de },
            fr: { translation: fr },
            hu: { translation: hu },
            nl: { translation: nl },
            ru: { translation: ru },
        },
        lng: localStorage.getItem('language') || 'ro',
        fallbackLng: 'ro',
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage'],
            caches: ['localStorage'],
            lookupLocalStorage: 'language',
        },
    })

export default i18n
