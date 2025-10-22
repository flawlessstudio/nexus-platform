import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const validationSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  countryOfOrigin: yup.string(),
  linkedin_profile_url: yup.string().url('Must be a valid URL').nullable(),
  twitter_profile_url: yup.string().url('Must be a valid URL').nullable(),
});

const ProfileEditForm = ({ user, onUpdateSuccess, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      countryOfOrigin: user.country_of_origin || '',
      linkedin_profile_url: user.linkedin_profile_url || '',
      twitter_profile_url: user.twitter_profile_url || '',
    },
  });
  const [serverError, setServerError] = useState('');

  const onSubmit = async (formData) => {
    setServerError('');
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch('/api/users/me', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdateSuccess(response.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      setServerError(message);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
  const errorClass = "text-red-600 text-sm mt-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
          <input type="text" id="firstName" {...register('firstName')} className={inputClass} />
          {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
          <input type="text" id="lastName" {...register('lastName')} className={inputClass} />
          {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="countryOfOrigin" className="block text-sm font-medium text-gray-700">Country of Origin</label>
        <input type="text" id="countryOfOrigin" {...register('countryOfOrigin')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="linkedin_profile_url" className="block text-sm font-medium text-gray-700">LinkedIn Profile URL</label>
        <input type="url" id="linkedin_profile_url" {...register('linkedin_profile_url')} className={inputClass} />
        {errors.linkedin_profile_url && <p className={errorClass}>{errors.linkedin_profile_url.message}</p>}
      </div>
      <div>
        <label htmlFor="twitter_profile_url" className="block text-sm font-medium text-gray-700">Twitter Profile URL</label>
        <input type="url" id="twitter_profile_url" {...register('twitter_profile_url')} className={inputClass} />
        {errors.twitter_profile_url && <p className={errorClass}>{errors.twitter_profile_url.message}</p>}
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <div className="flex items-center justify-end space-x-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default ProfileEditForm;

```

### 2. Create the Complete Profile Page (Frontend)

Next, I will create the `ProfilePage.jsx` component. This page will manage the view/edit state, fetch user data, and render either the user's information or the new edit form.

```diff
