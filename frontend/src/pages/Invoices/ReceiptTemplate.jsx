import React from "react";

export default function ReceiptTemplate({ invoice, printRef }) {
  if (!invoice) return null;

  return (
    <div 
      ref={printRef} 
      className="p-8 max-w-2xl mx-auto font-sans"
      style={{ width: '100%', minHeight: '100%', backgroundColor: '#ffffff', color: '#000000' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6" style={{ borderBottom: '2px solid #e4e4e7' }}>
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#2563eb' }}>SHOPFLOW</h1>
          <p className="text-sm" style={{ color: '#71717a' }}>Your modern retail partner</p>
          <div className="mt-4 text-sm" style={{ color: '#52525b' }}>
            <p>123 Commerce Avenue</p>
            <p>Tech District, TD 45678</p>
            <p>Phone: +1 (555) 123-4567</p>
            <p>Email: contact@shopflow.com</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#27272a' }}>RECEIPT</h2>
          <div className="text-sm">
            <p><span className="font-semibold" style={{ color: '#52525b' }}>Invoice #:</span> {invoice.invoice_number}</p>
            <p><span className="font-semibold" style={{ color: '#52525b' }}>Date:</span> {new Date(invoice.created_at).toLocaleDateString()}</p>
            <p><span className="font-semibold" style={{ color: '#52525b' }}>Time:</span> {new Date(invoice.created_at).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 pb-1" style={{ color: '#27272a', borderBottom: '1px solid #e4e4e7' }}>Billed To</h3>
        {invoice.customer ? (
          <div className="text-sm" style={{ color: '#3f3f46' }}>
            <p className="font-semibold text-base">{invoice.customer.name}</p>
            {invoice.customer.email && <p>{invoice.customer.email}</p>}
            {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
            {invoice.customer.address && <p>{invoice.customer.address}</p>}
            {invoice.customer.gst_number && <p className="mt-1"><span className="font-medium">GST:</span> {invoice.customer.gst_number}</p>}
          </div>
        ) : (
          <div className="text-sm italic" style={{ color: '#71717a' }}>Walk-in Customer</div>
        )}
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full text-sm text-left">
          <thead className="font-semibold uppercase text-xs" style={{ backgroundColor: '#fafafa', color: '#3f3f46', borderTop: '1px solid #e4e4e7', borderBottom: '1px solid #e4e4e7' }}>
            <tr>
              <th className="py-3 px-4">Item</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody style={{ borderBottom: '1px solid #f4f4f5' }}>
            {invoice.items?.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: index === invoice.items.length - 1 ? 'none' : '1px solid #f4f4f5' }}>
                <td className="py-3 px-4">
                  <p className="font-medium" style={{ color: '#27272a' }}>{item.product?.name || 'Unknown Product'}</p>
                  {item.product?.sku && <p className="text-xs" style={{ color: '#71717a' }}>SKU: {item.product.sku}</p>}
                </td>
                <td className="py-3 px-4 text-center" style={{ color: '#3f3f46' }}>{item.quantity}</td>
                <td className="py-3 px-4 text-right" style={{ color: '#3f3f46' }}>₹{item.unit_price.toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-medium" style={{ color: '#27272a' }}>₹{item.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-64 text-sm">
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f4f4f5' }}>
            <span style={{ color: '#52525b' }}>Subtotal:</span>
            <span className="font-medium" style={{ color: '#27272a' }}>₹{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f4f4f5' }}>
            <span style={{ color: '#52525b' }}>Tax (18%):</span>
            <span className="font-medium" style={{ color: '#27272a' }}>₹{invoice.tax_amount.toFixed(2)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f4f4f5', color: '#16a34a' }}>
              <span>Discount:</span>
              <span className="font-medium">-₹{invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-lg font-bold mt-1" style={{ borderBottom: '2px solid #27272a', color: '#18181b' }}>
            <span>Total:</span>
            <span>₹{invoice.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm mt-12 pt-8" style={{ color: '#71717a', borderTop: '1px solid #e4e4e7' }}>
        <p className="font-medium mb-1" style={{ color: '#3f3f46' }}>Thank you for your business!</p>
        <p>Returns accepted within 14 days with original receipt.</p>
        <p className="mt-4 text-xs">Generated by ShopFlow POS</p>
      </div>
    </div>
  );
}
