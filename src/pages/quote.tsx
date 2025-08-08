import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useMobile } from '@/context/MobileContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTranslation } from '@/hooks/useTranslation';

export default function QuotePage() {
  const { isMobile } = useMobile();
  const { trackQuoteRequest, trackButtonClick } = useAnalytics();
  const { t } = useTranslation();
  const [showBubble, setShowBubble] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [phone, setPhone] = useState('');
  
  // Update VSR Team form states
  const [updateSelectedFiles, setUpdateSelectedFiles] = useState<File[]>([]);
  const [updateStatusMessage, setUpdateStatusMessage] = useState('');
  const [updatePhone, setUpdatePhone] = useState('');
  const [contractID, setContractID] = useState('');
  const [contractData, setContractData] = useState<any>(null);
  
  // Update form specific state
  const [updateJobDescription, setUpdateJobDescription] = useState('');
  const [updateFullName, setUpdateFullName] = useState('');
  const [updateEmail, setUpdateEmail] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  

  function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 10);
  const parts = [];

  if (digits.length > 0) parts.push('(' + digits.substring(0, 3));
  if (digits.length >= 4) parts.push(') ' + digits.substring(3, 6));
  if (digits.length >= 7) parts.push('-' + digits.substring(6, 10));

  return parts.join('');
}

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowBubble(true);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    console.log('Files selected:', newFiles.length);
    
    // Filter out files that are too large or invalid
    const validFiles = newFiles.filter(file => {
      if (file.size === 0) {
        console.log('Skipping empty file:', file.name);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        console.log('File too large:', file.name);
        alert(t('quote.form.file_too_large', 'File {{filename}} is too large. Please select files under 10MB.').replace('{{filename}}', file.name));
        return false;
      }
      console.log('Valid file:', file.name, file.size, 'bytes');
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add selected files to FormData
    selectedFiles.forEach((file, index) => {
      formData.append('photos', file);
    });

    try {
      console.log('Submitting form with files...', selectedFiles.length, 'files');
      const res = await fetch('/api/quote', {
        method: 'POST',
        body: formData, // Send FormData directly (don't set Content-Type header)
      });

      const result = await res.json();
      console.log('Response:', result);

      if (result.success) {
        // Track successful quote request
        trackQuoteRequest();
        setStatusMessage(t('quote.success', 'Quote submitted successfully!'));
        setTimeout(() => setStatusMessage(''), 5000);
        form.reset();
        setSelectedFiles([]);
        setPhone('');
      } else {
        setStatusMessage(t('quote.error', 'Submission failed. Please try again.'));
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setStatusMessage(t('quote.network_error', 'Network error. Please try again.'));
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (

    <>
      <Head>
        <title>{t('quote.page_title', 'Request a Quote')} | VSR Construction</title>
      </Head>

      <section
        className="relative min-h-screen bg-cover bg-center text-white"
        style={{
          backgroundImage: `url('/quote.png')`,
        }}
      >
        
        <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-3xl mt-16">
            <h1 className="text-4xl font-bold text-center mb-6">{t('quote.title', 'Request a Quote')}</h1>

            {/* Chat Bubble */}
            <div className="mb-20 flex justify-end sm:justify-center">
              <div
                className={`relative bg-white text-gray-800 px-6 py-5 rounded-xl shadow-lg w-80 transition-opacity duration-1000 ease-in-out ${
                  showBubble ? 'opacity-100' : 'opacity-0'
                } ${isMobile ? 'mx-auto' : 'ml-auto'} ${isMobile ? 'pb-8' : ''}`}
              >
                <p className="text-sm sm:text-base leading-relaxed">
                  {t('quote.description', 'Let us know what services you need and we\'ll get back to you with a custom quote.')}
                </p>

                {!isMobile ? (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"></div>
                ) : (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              encType="multipart/form-data"
              className="space-y-6 bg-gray-800 bg-opacity-90 p-6 rounded-lg shadow-md"
            >
              <div>
                <label className="block mb-2 text-sm font-medium">
                  {t('quote.form.name', 'Full Name')}
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder={t('quote.form.name_placeholder', 'John Doe')}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  {t('quote.form.email', 'Email Address')}
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder={t('quote.form.email_placeholder', 'you@example.com')}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  {t('quote.form.phone', 'Phone Number')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder={t('quote.form.phone_placeholder', '(123) 456-7890')}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.form.service_class', 'Service Class')}</label>
                <select
                  name="serviceClass"
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                >
                  <option value="">{t('quote.form.service_class_placeholder', 'Select Service Class')}</option>
                  <option value="commercial">{t('quote.form.commercial', 'Commercial')}</option>
                  <option value="residential">{t('quote.form.residential', 'Residential')}</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.form.service_type', 'Service Requested')}</label>
                <select
                  name="service"
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                >
                  <option value="">{t('quote.form.service_type_placeholder', 'Select Service')}</option>
                  <option value="snow-ice-removal">{t('quote.form.service_options.snow_ice', 'Snow and Ice Removal (Commercial Only)')}</option>
                  <option value="landscaping">{t('quote.form.service_options.landscaping', 'Landscaping / Hardscaping')}</option>
                  <option value="concrete-asphalt">{t('quote.form.service_options.concrete', 'Concrete / Asphalt Repairs')}</option>
                  <option value="demolition">{t('quote.form.service_options.demolition', 'Demolition')}</option>
                  <option value="painting">{t('quote.form.service_options.painting', 'Painting')}</option>
                  <option value="other">{t('quote.form.service_options.other', 'Other')}</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.form.details', 'Additional Details')}</label>
                <textarea
                  name="details"
                  rows={4}
                  placeholder={t('quote.form.details_placeholder', 'Describe your project...')}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                ></textarea>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.form.photos', 'Upload Files (optional)')}</label>
                <p className="text-xs text-gray-400 mb-2">
                  Supported formats: Images (JPG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, XLS, XLSX), Text files (TXT, CSV) - Max 5MB per file
                </p>

                <input
                  type="file"
                  id="photoInput"
                  name="photos"
                  //accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('photoInput')?.click();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm transition-colors"
                  >
                    {selectedFiles.length > 0 ? t('quote.form.add_more_files', 'Add More Files') : t('quote.form.choose_files', 'Choose Files')}
                  </button>
                  
                  {selectedFiles.length > 0 && (
                    <span className="text-sm text-gray-300">
                      {selectedFiles.length} {t('quote.form.files_selected', 'file(s) selected')}
                    </span>
                  )}
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 bg-gray-700 p-4 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white text-sm font-medium">{t('quote.form.selected_files', 'Selected Files:')}</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        {t('quote.form.clear_all', 'Clear All')}
                      </button>
                    </div>
                    
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-600 p-2 rounded">
                        <div>
                          <p className="text-white text-sm">{file.name}</p>
                          <p className="text-gray-300 text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-400 hover:text-red-300 text-xs ml-2"
                        >
                          {t('quote.form.remove', 'Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                onClick={() => trackButtonClick('Submit Quote Request')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-semibold transition"
              >
                {t('quote.form.submit', 'Submit Request')}
              </button>
              
              <p className="text-xs text-gray-400 mt-2 text-center">
                By submitting, you consent to us storing your data per our{' '}
                <a href="/privacy-policy" className="underline hover:text-gray-300">
                  Privacy Policy
                </a>.
              </p>
            </form>
            
            {statusMessage && (
              <div className="mt-4 p-3 rounded bg-yellow-700 text-white text-sm text-center">
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Update VSR Team Form */}
      <section id="update-vsr-team" className="min-h-screen bg-gray-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-center">{t('quote.update_form.title', 'Update the VSR Team')}</h2>
            <p className="text-gray-300 text-center mb-8">
              {t('quote.update_form.description', 'Keep us informed about your project progress, questions, or concerns')}
            </p>
            
            <form 
              action="/api/quote-update" 
              method="POST" 
              encType="multipart/form-data"
              onSubmit={async (e) => {
                e.preventDefault();
                
                const form = e.currentTarget;
                const formData = new FormData(form);
                
                // Add files to FormData
                updateSelectedFiles.forEach((file, index) => {
                  formData.append(`updateFile${index}`, file);
                });

                try {
                  console.log('Submitting update with files...', updateSelectedFiles.length, 'files');
                  const res = await fetch('/api/quote-update', {
                    method: 'POST',
                    body: formData,
                  });

                  const result = await res.json();
                  console.log('Update response:', result);

                  if (result.success) {
                    setUpdateStatusMessage(t('quote.update_form.success', 'Update sent successfully! We\'ll be in touch soon.'));
                    form.reset();
                    setUpdateSelectedFiles([]);
                    setContractID('');
                    setContractData(null);
                    setUpdatePhone('');
                    setUpdateJobDescription('');
                    setUpdateFullName('');
                    setUpdateEmail('');
                    setUpdateNotes('');
                  } else {
                    setUpdateStatusMessage(t('quote.update_form.error', 'Error sending update. Please try again.'));
                  }
                  setTimeout(() => setUpdateStatusMessage(''), 5000);
                } catch (error) {
                  console.error('Update submit error:', error);
                  setUpdateStatusMessage(t('quote.update_form.error', 'Error sending update. Please try again.'));
                  setTimeout(() => setUpdateStatusMessage(''), 5000);
                }
              }}
              className="space-y-6"
            >
              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.update_form.contract_id', 'Contract ID (if known)')}</label>
                <input
                  type="text"
                  name="contractID"
                  value={contractID}
                  onChange={(e) => {
                    setContractID(e.target.value);
                    // TODO: Implement contract lookup
                  }}
                  placeholder={t('quote.update_form.contract_id_placeholder', 'Enter your contract ID')}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.update_form.job_description', 'Job Description')}</label>
                <textarea
                  name="jobDescription"
                  rows={3}
                  placeholder={t('quote.update_form.job_description_placeholder', 'Brief description of your project...')}
                  value={updateJobDescription}
                  onChange={(e) => setUpdateJobDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">{t('quote.form.name', 'Full Name')}</label>
                  <input
                    type="text"
                    name="fullName"
                    value={updateFullName}
                    onChange={(e) => setUpdateFullName(e.target.value)}
                    placeholder={t('quote.form.name_placeholder', 'Your full name')}
                    className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">{t('quote.form.email', 'Email Address')}</label>
                  <input
                    type="email"
                    name="email"
                    value={updateEmail}
                    onChange={(e) => setUpdateEmail(e.target.value)}
                    placeholder={t('quote.form.email_placeholder', 'your@email.com')}
                    className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.form.phone', 'Phone Number')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={updatePhone}
                  onChange={(e) => setUpdatePhone(formatPhoneNumber(e.target.value))}
                  placeholder={t('quote.form.phone_placeholder', '(555) 123-4567')}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.update_form.reason_for_contact', 'Reason for Contact')}</label>
                <select
                  name="reasonForContact"
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  required
                >
                  <option value="">{t('quote.update_form.reason_placeholder', 'Select reason')}</option>
                  <option value="sending-files">{t('quote.update_form.reason_options.files', 'Sending Files, Photos, & Notes')}</option>
                  <option value="meeting-request">{t('quote.update_form.reason_options.meeting', 'Meeting Request')}</option>
                  <option value="account-creation">{t('quote.update_form.reason_options.account', 'Account Creation')}</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.update_form.notes', 'Notes')}</label>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder={t('quote.update_form.notes_placeholder', 'Additional notes, questions, or concerns...')}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                ></textarea>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">{t('quote.form.photos', 'Upload Files (optional)')}</label>
                <p className="text-xs text-gray-400 mb-2">
                  Supported formats: Images (JPG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, XLS, XLSX), Text files (TXT, CSV) - Max 5MB per file
                </p>
                <input
                  type="file"
                  id="updatePhotoInput"
                  name="updatePhotos"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files) return;
                    const newFiles = Array.from(e.target.files);
                    const validFiles = newFiles.filter(file => {
                      if (file.size === 0) return false;
                      if (file.size > 10 * 1024 * 1024) {
                        alert(t('quote.form.file_too_large', 'File {{filename}} is too large. Please select files under 10MB.').replace('{{filename}}', file.name));
                        return false;
                      }
                      return true;
                    });
                    setUpdateSelectedFiles(prev => [...prev, ...validFiles]);
                  }}
                />

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => document.getElementById('updatePhotoInput')?.click()}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm transition-colors"
                  >
                    {updateSelectedFiles.length > 0 ? t('quote.form.add_more_files', 'Add More Files') : t('quote.form.choose_files', 'Choose Files')}
                  </button>
                  
                  {updateSelectedFiles.length > 0 && (
                    <span className="text-sm text-gray-300">
                      {updateSelectedFiles.length} {t('quote.form.files_selected', 'file(s) selected')}
                    </span>
                  )}
                </div>

                {updateSelectedFiles.length > 0 && (
                  <div className="mt-4 bg-gray-700 p-4 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white text-sm font-medium">{t('quote.form.selected_files', 'Selected Files:')}</h3>
                      <button
                        type="button"
                        onClick={() => setUpdateSelectedFiles([])}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        {t('quote.form.clear_all', 'Clear All')}
                      </button>
                    </div>
                    
                    {updateSelectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-600 p-2 rounded">
                        <div>
                          <p className="text-white text-sm">{file.name}</p>
                          <p className="text-gray-300 text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-400 hover:text-red-300 text-xs ml-2"
                        >
                          {t('quote.form.remove', 'Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                onClick={() => trackButtonClick('Submit Update VSR Team')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-semibold transition"
              >
                {t('quote.update_form.submit', 'Send Update')}
              </button>
              
              <p className="text-xs text-gray-400 mt-2 text-center">
                By submitting, you consent to us storing your data per our{' '}
                <a href="/privacy-policy" className="underline hover:text-gray-300">
                  Privacy Policy
                </a>.
              </p>
            </form>
            
            {updateStatusMessage && (
              <div className="mt-4 p-3 rounded text-center">
                <p className={updateStatusMessage.includes('Error') ? 'text-red-400 bg-red-900 bg-opacity-20 p-3 rounded' : 'text-green-400 bg-green-900 bg-opacity-20 p-3 rounded'}>
                  {updateStatusMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}