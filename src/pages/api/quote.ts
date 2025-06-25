import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new IncomingForm({
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    multiples: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    filter: () => true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ error: 'Failed to process request' });
    }

    console.log('FIELDS:', fields);
    console.log('FILES:', files);

    const fullName = Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName;
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone;
    const service = Array.isArray(fields.service) ? fields.service[0] : fields.service;
    const details = Array.isArray(fields.details) ? fields.details[0] : fields.details;

    const photos = files.photos;
    const photoFiles = Array.isArray(photos) ? photos : photos ? [photos] : [];
    console.log('Raw uploaded files:', photoFiles);

    const attachments = photoFiles
    .filter(
      (file): file is File =>
        !!file &&
        typeof file.filepath === 'string' &&
        file.filepath.length > 0 &&
        typeof file.size === 'number' &&
        file.size > 0 &&
        typeof file.originalFilename === 'string' &&
        file.originalFilename.length > 0
    )
    .map((file) => ({
      filename: file.originalFilename!,
      path: file.filepath!,
    }));

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        //to: 'citylife32@outlook.com',
        to: 'marcus@vsrsnow.com, zach@vsrsnow.com, citylife32@outlook.com',
        subject: `Quote Request from ${fullName}`,
        text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nService: ${service}\n\nDetails:\n${details}`,
        attachments,
      });
      console.log('Prepared attachments:', attachments);


      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Email failed to send:', error);
      return res.status(500).json({ error: 'Email failed to send' });
    }
  });
}
