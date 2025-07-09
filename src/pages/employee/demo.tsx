/**
 * Employee System Demo Page
 * Showcase the complete employee management system
 */

import React from 'react';
import Head from 'next/head';
import EmployeeSystemDemo from '../../components/employee/EmployeeSystemDemo';

const EmployeeDemoPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Employee System Demo - VSR</title>
        <meta name="description" content="VSR Employee Management System Demo" />
      </Head>
      <EmployeeSystemDemo />
    </>
  );
};

export default EmployeeDemoPage;