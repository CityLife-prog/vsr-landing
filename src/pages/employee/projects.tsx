/**
 * Employee Projects Page
 * Interface for managing service data and project entries
 */

import React from 'react';
import Head from 'next/head';
import EmployeeProjects from '../../components/employee/EmployeeProjects';

const EmployeeProjectsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Projects - VSR Employee Portal</title>
        <meta name="description" content="Manage service data and project entries" />
        <meta name="keywords" content="VSR, employee, projects, service data, snow removal" />
      </Head>
      <EmployeeProjects />
    </>
  );
};

export default EmployeeProjectsPage;