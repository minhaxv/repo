import React from 'react';
import { CreateSupplierModal } from './CreateSupplierModal';

/**
 * Consolidated Vendor Modal
 * Routes to the canonical CreateSupplierModal (unified Supplier & Vendor master entity).
 */
export const CreateVendorModal = ({ isOpen, onClose, onVendorCreated }) => {
  return (
    <CreateSupplierModal
      isOpen={isOpen}
      onClose={onClose}
      onSupplierCreated={onVendorCreated}
      defaultCategory="Outsource Job Work Vendor"
      title="Create New Outsource Vendor"
    />
  );
};

export default CreateVendorModal;
