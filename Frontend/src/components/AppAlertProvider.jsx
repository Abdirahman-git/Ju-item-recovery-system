import React, { useEffect } from 'react';
import { useAppAlert } from '../hooks/useAppAlert';
import { setAppAlertApi } from '../utils/appAlert';

export default function AppAlertProvider({ children }) {
  const alertApi = useAppAlert();

  useEffect(() => {
    setAppAlertApi(alertApi);
    return () => setAppAlertApi(null);
  }, [alertApi]);

  return (
    <>
      {children}
      {alertApi.AlertUI}
      {alertApi.ConfirmUI}
    </>
  );
}
