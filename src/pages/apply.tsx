import React, { useRef, useState } from 'react';

export default function ApplyPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [setFormSubmitted] = useState(false);
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
        setStatusMessage('Application submitted successfully!');
        setTimeout(() => setStatusMessage(''), 5000);
        setFormSubmitted(true);
        formRef.current?.reset();
        setSelectedFile(null);
        setPhone('');
        //alert('Application submitted successfully.');
      } else {
        setStatusMessage(`Submission failed: ${result.error}`);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      alert('An error occurred.');
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
    <h1 className="text-4xl font-bold text-center mb-6">Apply Today</h1>
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
        <label className="block mb-2 text-sm font-medium">Full Name</label>
        <input 
          type="text"
          name="name" 
          placeholder="John Doe"
          className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium">Email Address</label>
        <input 
          name="email" 
          type="email" 
          placeholder="you@example.com"
          className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium">Phone</label>
        <input 
          type="tel"
          name="phone" 
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          placeholder="(123) 456-7890"
          className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium">Experience</label>
        <textarea
          name="experience"
          rows={4}
          placeholder="Provide a brief overview of your experience..."
          className="w-full p-2 bg-gray-700 rounded"
        ></textarea>
      </div>
      
      <div>
        <label className="block mb-2 text-sm font-medium">Resume</label>
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
        Submit Application
      </button>
    </form>
    </div>
  );
}
