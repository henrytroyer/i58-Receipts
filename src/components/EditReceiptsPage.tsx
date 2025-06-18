import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EditReceipts from './EditReceipts';

const EditReceiptsPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <EditReceipts open={false} />
    );
  }

  return (
    <EditReceipts open={true} />
  );
};

export default EditReceiptsPage; 