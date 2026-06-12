import React from 'react';
import { Navigate } from 'react-router-dom';

/* Portfolio content now lives in Landing's "Builder" section (#builder). */
export default function Portfolio() {
  return <Navigate to="/#builder" replace />;
}
