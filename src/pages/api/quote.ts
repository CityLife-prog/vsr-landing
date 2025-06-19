// pages/api/quote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, service, details } = req.body;

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
      subject: `Quote Request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${service}\n\nDetails:\n${details}`,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Email failed to send' });
  }
}
