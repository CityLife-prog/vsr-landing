import React, { useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ApplyPage() {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setFormSubmitted] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const [phone, setPhone] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(formRef.current!);

    if (selectedFile) {
      formData.append('resume', selectedFile);
    }

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setStatusMessage(t('apply.success', 'Application submitted successfully!'));
        setTimeout(() => setStatusMessage(''), 5000);
        setFormSubmitted(true);
        formRef.current?.reset();
        setSelectedFile(null);
        setPhone('');
      } else {
        setStatusMessage(t('apply.error', `Submission failed: ${result.error}`));
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setStatusMessage(t('apply.network_error', 'An error occurred. Please try again.'));
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };
  function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 10);
  const parts = [];

  if (digits.length > 0) parts.push('(' + digits.substring(0, 3));
  if (digits.length >= 4) parts.push(') ' + digits.substring(3, 6));
  if (digits.length >= 7) parts.push('-' + digits.substring(6, 10));

  return parts.join('');
}


  return (
    <div className="w-full max-w-3xl mt-16 mx-auto">
    <h1 className="text-4xl font-bold text-center mb-6">{t('apply.title', 'Apply Today')}</h1>
    {statusMessage && (
      <div className="mb-4 p-3 rounded bg-yellow-700 text-white text-sm text-center">
        {statusMessage}
      </div>
    )}

    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 bg-gray-800 p-6 rounded-lg text-white"
    >
      <div>
        <label className="block mb-2 text-sm font-medium">{t('apply.form.name', 'Full Name')}</label>
        <input 
          type="text"
          name="name" 
          placeholder={t('apply.form.name_placeholder', 'John Doe')}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          required />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium">{t('apply.form.email', 'Email Address')}</label>
        <input 
          name="email" 
          type="email" 
          placeholder={t('apply.form.email_placeholder', 'you@example.com')}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium">{t('apply.form.phone', 'Phone')}</label>
        <input 
          type="tel"
          name="phone" 
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          placeholder={t('apply.form.phone_placeholder', '(123) 456-7890')}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          required />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium">{t('apply.form.experience', 'Experience')}</label>
        <textarea
          name="experience"
          rows={4}
          placeholder={t('apply.form.experience_placeholder', 'Provide a brief overview of your experience...')}
          className="w-full p-2 bg-gray-800 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        ></textarea>
      </div>
      
      <div>
        <label className="block mb-2 text-sm font-medium">{t('apply.form.resume', 'Resume')}</label>
        <input
          type="file"
          name="resume"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="w-full p-2 bg-gray-700 rounded"
          required
        />
        {selectedFile && (
          <div className="mt-2 bg-gray-700 p-2 rounded">
            <p>{selectedFile.name}</p>
            <p className="text-xs text-gray-300">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
        )}
      </div>
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded">
        {t('apply.form.submit', 'Submit Application')}
      </button>
      
      <p className="text-xs text-gray-400 mt-2 text-center">
        By submitting, you consent to us storing your data per our{' '}
        <a href="/privacy-policy" className="underline hover:text-gray-300">
          Privacy Policy
        </a>.
      </p>
    </form>
    </div>
  );
}
