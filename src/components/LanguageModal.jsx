import React, { useState } from 'react';
import { Globe, Check, X } from 'lucide-react';
import { useTranslation } from '../store/languageStore';

export default function LanguageModal({ isOpen, onClose }) {
  const { language, setLanguage, t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(language);

  // Sync selectedLang when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedLang(language);
    }
  }, [isOpen, language]);

  if (!isOpen) return null;

  const handleApply = () => {
    setLanguage(selectedLang);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        className="bg-surface rounded-3xl p-6 border border-line shadow-2xl w-full max-w-sm flex flex-col gap-5 relative animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-main leading-tight">
                {t('language.selectLanguage', 'Select Language')}
              </h3>
              <p className="text-[11px] text-muted font-medium mt-0.5">
                {t('language.chooseLanguageSubtitle', 'Choose your application display language')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-main hover:bg-base transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Language Options */}
        <div className="flex flex-col gap-2.5">
          {/* English Option */}
          <label
            onClick={() => setSelectedLang('en')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedLang === 'en'
                ? 'border-orange-500 bg-orange-500/5 shadow-xs'
                : 'border-line hover:border-orange-500/40 bg-base/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedLang === 'en'
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-muted/40'
                }`}
              >
                {selectedLang === 'en' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-main">English</span>
                <span className="text-[11px] text-muted font-semibold">English</span>
              </div>
            </div>
            {selectedLang === 'en' && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600">
                Selected
              </span>
            )}
          </label>

          {/* Telugu Option */}
          <label
            onClick={() => setSelectedLang('te')}
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedLang === 'te'
                ? 'border-orange-500 bg-orange-500/5 shadow-xs'
                : 'border-line hover:border-orange-500/40 bg-base/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedLang === 'te'
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-muted/40'
                }`}
              >
                {selectedLang === 'te' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-main">తెలుగు</span>
                <span className="text-[11px] text-muted font-semibold">Telugu</span>
              </div>
            </div>
            {selectedLang === 'te' && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600">
                ఎంపికైంది
              </span>
            )}
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-muted hover:text-main hover:bg-base transition-colors cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#E6700D] text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('common.apply', 'Apply')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
