/**
 * Admin Login Page
 * Login page specifically for admin users
 */

import React from 'react';
import Head from 'next/head';
import AdminLogin from '../../components/admin/AdminLogin';

const AdminLoginPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Admin Login - VSR</title>
        <meta name="description" content="VSR Admin Console Login" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLogin />
    </>
  );
};

export default AdminLoginPage;