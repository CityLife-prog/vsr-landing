// 2. apply.ts (Backend handler)

import type { NextApiRequest, NextApiResponse } from 'next';
//import formidable from 'formidable';
import nodemailer from 'nodemailer';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    const resume = files.resume;
    if (!resume) {
      return res.status(400).json({ error: 'Resume file missing' });
    }

    const resumeFile = Array.isArray(resume)
      ? resume[0]
      : resume;
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
        to: 'marcus@vsrsnow.com',
        subject: `New Job Application: ${fields.name}`,
        text: `Name: ${fields.name}\nEmail: ${fields.email}\nPhone: ${fields.phone}\nExperience: ${fields.experience}`,
        attachments: [
          {
            filename: resumeFile.originalFilename || 'resume.pdf',
            path: resumeFile.filepath,
          },
        ],
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Email send error:', error);
      res.status(500).json({ error: 'Email failed to send' });
    }    
  });
}

/*// 2. apply.ts (Backend handler)

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    const resumeFile = files.resume as formidable.File;
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
        to: 'marcus@vsrsnow.com, zach@vsrsnow.com',
        subject: `New Job Application: ${fields.name}`,
        text: `Name: ${fields.name}\nEmail: ${fields.email}\nPhone: ${fields.phone}\nExperience: ${fields.experience}`,
        attachments: [
          {
            filename: resumeFile.originalFilename || 'resume.pdf',
            path: resumeFile.filepath,
          },
        ],
      });
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Email failed to send' });
    }
  });
}
*/
