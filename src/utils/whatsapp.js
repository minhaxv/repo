// WhatsApp Click-to-Chat & Invoice Dispatch Utility for ScreenArts ERP

export const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove spaces, + signs, dashes, and special characters
  let cleaned = phone.toString().replace(/[^\d]/g, '');

  // Prepend default Indian country code +91 (91) if 10-digit mobile
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Already has 91 prefix
  } else if (cleaned.length > 10 && !cleaned.startsWith('91')) {
    cleaned = `91${cleaned.slice(-10)}`;
  }
  return cleaned;
};

export const buildWhatsAppMessage = (order, companyProfile) => {
  const invoiceNo = `INV-${order.id.replace('SO-', '')}`;
  const salesOrderNo = order.id;
  const customerName = order.customerName || 'Customer';
  const invoiceDate = order.orderDate || new Date().toISOString().split('T')[0];
  const grandTotal = (order.grandTotal || 0).toLocaleString('en-IN');
  const balance = (order.balanceAmount !== undefined ? order.balanceAmount : order.grandTotal || 0).toLocaleString('en-IN');
  const companyName = companyProfile?.name || 'ScreenArts Digital & Signage India Pvt Ltd';

  return `Hello ${customerName},\n\nThank you for your order.\n\nInvoice No: ${invoiceNo}\nOrder No: ${salesOrderNo}\nInvoice Date: ${invoiceDate}\nAmount: ₹${grandTotal}\nBalance: ₹${balance}\n\nPlease find your invoice attached.\n\nThank you for choosing ${companyName}.`;
};

export const handleSendWhatsApp = ({
  order,
  companyProfile,
  activeUser,
  trackWhatsAppSent,
  onDownloadPdf
}) => {
  if (!order) return false;

  // 1. Validate Customer Mobile Number
  const mobileRaw = order.customerMobile;
  if (!mobileRaw || !mobileRaw.trim()) {
    alert('Customer mobile number is missing.');
    return false;
  }

  const sanitizedPhone = sanitizePhoneNumber(mobileRaw);
  if (!sanitizedPhone || sanitizedPhone.length < 10) {
    alert('Customer mobile number is missing or invalid.');
    return false;
  }

  // 2. Generate PDF / Download if callback provided
  if (onDownloadPdf) {
    try {
      onDownloadPdf();
    } catch (e) {
      console.log('PDF download triggered');
    }
  }

  // 3. Create WhatsApp Message
  const messageText = buildWhatsAppMessage(order, companyProfile);
  const encodedMessage = encodeURIComponent(messageText);

  // 4. Click-to-Chat URL
  const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;

  // 5. Update ERP Status
  if (trackWhatsAppSent) {
    trackWhatsAppSent(order.id);
  }

  // 6. Open WhatsApp Web or Mobile App
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  // 7. Show success notification
  setTimeout(() => {
    alert('WhatsApp opened successfully.');
  }, 300);

  return true;
};
