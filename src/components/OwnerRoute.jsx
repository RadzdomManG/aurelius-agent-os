import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { usePortal } from '@/lib/PortalContext';

export default function OwnerRoute() {
  const { isOwner, isLoadingAuth } = usePortal();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isOwner) return <Outlet />;
  return <Navigate to="/access" replace />;
}