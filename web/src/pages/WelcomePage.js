import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import i18n from '../i18n';

const WelcomePage = () => {
  const { t } = useTranslation();
  const [isLoginView, setIsLoginView] = useState(true);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-md">
        <div className="flex justify-end space-x-4">
          <button onClick={() => i18n.changeLanguage('en')} className="font-semibold text-gray-500">EN</button>
          <button onClick={() => i18n.changeLanguage('es')} className="font-semibold text-gray-500">ES</button>
        </div>
        <div className="text-center mt-4">
          <h1 className="text-3xl font-bold text-gray-900">🌍 NEXUS</h1>
          <p className="mt-2 text-gray-600">{t('welcome_title')}</p>
        </div>
        {isLoginView ? <LoginForm /> : <RegisterForm />}
        <div className="text-center mt-4">
          <button onClick={() => setIsLoginView(!isLoginView)} className="text-blue-600">
            {isLoginView ? t('need_account') : t('have_account')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default WelcomePage;
