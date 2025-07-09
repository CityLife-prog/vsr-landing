/**
 * Training Page - Client Training Dashboard
 * Interactive training progress tracker and resource center
 */

import React from 'react';
import Head from 'next/head';
import ClientTrainingDashboard from '../components/ClientTrainingDashboard';

const TrainingPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>VSR Training Center - Master Your Website</title>
        <meta name="description" content="Master your VSR website with our comprehensive training modules and resources" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <main>
        <ClientTrainingDashboard />
      </main>
    </>
  );
};

export default TrainingPage;