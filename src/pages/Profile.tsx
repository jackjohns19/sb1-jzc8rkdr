import React from 'react';
import { useParams } from 'react-router-dom';

export default function Profile() {
  const { id } = useParams();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {/* Profile content will be implemented here */}
        <p className="text-gray-600">Profile content coming soon...</p>
      </div>
    </div>
  );
}