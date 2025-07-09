/**
 * Employee Registration Page
 * Public page for new employee registration
 */

import React from 'react';
import Head from 'next/head';
import EmployeeRegistration from '../../components/employee/EmployeeRegistration';

const EmployeeRegisterPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Employee Registration - VSR</title>
        <meta name="description" content="Register for a VSR employee account" />
        <meta name="keywords" content="VSR, employee, registration, snow removal, account" />
      </Head>
      <EmployeeRegistration />
    </>
  );
};

export default EmployeeRegisterPage;