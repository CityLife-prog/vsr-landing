// 1. apply.tsx (Job Application Page)

import { useState } from 'react';

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    resume: null as File | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, resume: e.target.files?.[0] ?? null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('phone', formData.phone);
    data.append('experience', formData.experience);
    if (formData.resume) data.append('resume', formData.resume);

    const res = await fetch('/api/apply', {
      method: 'POST',
      body: data,
    });

    if (res.ok) {
      alert('Application submitted successfully!');
    } else {
      alert('Submission failed.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-white">
      <h1 className="text-3xl font-bold mb-6">Apply for a Position</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full px-4 py-2 bg-gray-800 rounded" name="name" placeholder="Full Name" onChange={handleChange} required />
        <input className="w-full px-4 py-2 bg-gray-800 rounded" name="email" placeholder="Email" type="email" onChange={handleChange} required />
        <input className="w-full px-4 py-2 bg-gray-800 rounded" name="phone" placeholder="Phone Number" onChange={handleChange} required />
        <textarea className="w-full px-4 py-2 bg-gray-800 rounded" name="experience" placeholder="Briefly describe your experience" onChange={handleChange} required />
        <input type="file" name="resume" accept=".pdf,.doc,.docx" className="block w-full text-sm text-gray-300 bg-gray-700 rounded px-4 py-2" onChange={handleFileChange} required />

        <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold">Submit Application</button>
      </form>
    </div>
  );
}

