/**
 * Employee Dashboard Page
 * Main dashboard for verified employees with access to tools and services
 */

import React from 'react';
import Head from 'next/head';
import { useAuth } from '../../context/AuthContext';
import EmployeeDashboard from '../../components/employee/EmployeeDashboard';

const EmployeeDashboardPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Employee Dashboard - VSR</title>
        <meta name="description" content="VSR Employee Dashboard - Access your tools and services" />
        <meta name="keywords" content="VSR, employee, dashboard, tools, services" />
      </Head>
      <EmployeeDashboard />
    </>
  );
};

export default EmployeeDashboardPage;