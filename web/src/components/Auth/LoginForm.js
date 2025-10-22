import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const LoginForm = () => {
  const { register, handleSubmit } = useForm();
  const { login } = useAuth();
  const { t } = useTranslation();

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-8">
      <input {...register('email')} type="email" required placeholder={t('email_address')} className="w-full px-3 py-2 border rounded-md"/>
      <input {...register('password')} type="password" required placeholder={t('password')} className="w-full px-3 py-2 border rounded-md"/>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">{t('sign_in')}</button>
    </form>
  );
};
export default LoginForm;
