import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Language, 
  translations, 
  MARATHI_WARDS_MAP, 
  MARATHI_CATEGORIES_MAP, 
  MARATHI_EQUIPMENT_MAP, 
  MARATHI_ISSUES_TRANSLATIONS 
} from './translations';
import { CivicIssue } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations['en'];
  getWardName: (ward: string) => string;
  getCategoryName: (cat: string) => string;
  getEquipmentName: (equip: string) => string;
  getIssueText: (issue: CivicIssue) => {
    title: string;
    description: string;
    justification: string;
    landmark: string;
  };
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('kpg_language') as Language;
    return saved === 'mr' || saved === 'en' ? saved : 'mr'; // Default to Marathi / bilingual
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kpg_language', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  const t = translations[language];

  const getWardName = (ward: string): string => {
    if (language === 'mr' && MARATHI_WARDS_MAP[ward]) {
      return MARATHI_WARDS_MAP[ward];
    }
    return ward;
  };

  const getCategoryName = (cat: string): string => {
    if (language === 'mr' && MARATHI_CATEGORIES_MAP[cat]) {
      return MARATHI_CATEGORIES_MAP[cat];
    }
    return cat;
  };

  const getEquipmentName = (equip: string): string => {
    if (language === 'mr' && MARATHI_EQUIPMENT_MAP[equip]) {
      return MARATHI_EQUIPMENT_MAP[equip];
    }
    return equip;
  };

  const getIssueText = (issue: CivicIssue) => {
    if (language === 'mr' && MARATHI_ISSUES_TRANSLATIONS[issue.ticketNumber]) {
      const translated = MARATHI_ISSUES_TRANSLATIONS[issue.ticketNumber];
      return {
        title: translated.title,
        description: translated.description,
        justification: translated.justification,
        landmark: translated.landmark
      };
    }
    return {
      title: issue.title,
      description: issue.description,
      justification: issue.justification,
      landmark: issue.locationLandmark
    };
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        getWardName,
        getCategoryName,
        getEquipmentName,
        getIssueText
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
