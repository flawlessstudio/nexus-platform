import React from 'react';

const ProfilePictureUploader = ({ onImageChange, currentImage }) => {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !onImageChange) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (typeof loadEvent.target?.result === 'string') {
        onImageChange(loadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <img
          src={currentImage || '/default-avatar.png'}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
        />
        <label
          htmlFor="profile-picture"
          className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </label>
        <input id="profile-picture" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
      <p className="text-sm text-gray-500">Click to change profile picture</p>
    </div>
  );
};

export default ProfilePictureUploader;
