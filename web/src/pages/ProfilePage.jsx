import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import ProfilePictureUploader from '../components/Profile/ProfilePictureUploader.jsx';
import ProfileEditForm from '../components/Profile/ProfileEditForm.jsx';
import Modal from '../components/Common/Modal.jsx';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('Authentication token not found. Please log in.');
        }
        const response = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        setProfilePicture(response.data?.profile_picture_url || '');
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Failed to fetch profile.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleProfileSave = async (formData) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      };

      const response = await axios.patch('/api/users/me', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedUser = response.data;
      setUser(updatedUser);
      setProfilePicture(updatedUser?.profile_picture_url || profilePicture);
      setIsEditing(false);
      return updatedUser;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update profile.';
      throw new Error(message);
    }
  };

  const profileDetails = useMemo(() => {
    if (!user) {
      return null;
    }

    return (
      <>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {user.first_name} {user.last_name}
            </h1>
            <p className="text-gray-600 mb-6">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          >
            Edit Profile
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700">Role</h3>
            <p className="capitalize">{user.role}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">Country of Origin</h3>
            <p>{user.country_of_origin || 'Not specified'}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">Social Links</h3>
            <p>
              LinkedIn:{' '}
              {user.linkedin_profile_url ? (
                <a
                  href={user.linkedin_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Profile
                </a>
              ) : (
                'Not specified'
              )}
            </p>
            <p>
              Twitter:{' '}
              {user.twitter_profile_url ? (
                <a
                  href={user.twitter_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Profile
                </a>
              ) : (
                'Not specified'
              )}
            </p>
          </div>
        </div>
      </>
    );
  }, [user]);

  if (loading) {
    return <div className="text-center mt-10">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 mt-10">{error}</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <ProfilePictureUploader currentImage={profilePicture} onImageChange={setProfilePicture} />
        </div>
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm">{profileDetails}</div>
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Profile">
        <ProfileEditForm
          user={user}
          onSave={handleProfileSave}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>
    </div>
  );
};

export default ProfilePage;
