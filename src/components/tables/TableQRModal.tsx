/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Printer, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { Table } from '../../types';
import { Modal, Button } from '../ui';
import {
  generateTableQRCodeDataUrl,
  getTableMenuUrl,
  getTableQRFilename,
  triggerFileDownload,
} from '../../utils/qr';

export interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  onOpenMenu?: (tableId: string) => void;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  isOpen,
  onClose,
  table,
  onOpenMenu,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !table) {
      setQrDataUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    generateTableQRCodeDataUrl(table.id, {
      width: 400,
      margin: 2,
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code for table:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, table]);

  if (!table) return null;

  const fullUrl = getTableMenuUrl(table.id);
  const displayUrl = fullUrl.replace(/^https?:\/\//, '');

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const filename = getTableQRFilename(table);
    triggerFileDownload(qrDataUrl, filename);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${table.name} QR Code`}
      subtitle="Table Dine-In Menu & Ordering"
      maxWidth="md"
    >
      <div className="flex flex-col items-center space-y-5">
        {/* Printable Restaurant Table Tent QR Card */}
        <div
          id="printable-table-qr-card"
          className="bg-white border-2 border-slate-800 rounded-2xl p-6 w-full max-w-[320px] flex flex-col items-center text-center shadow-md relative"
        >
          {/* Restaurant Header */}
          <div className="mb-3">
            <h4 className="text-xs font-black tracking-widest text-slate-900 uppercase">
              RESTOCONTROL
            </h4>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              Digital Table Ordering
            </p>
          </div>

          {/* QR Code Container */}
          <div className="w-48 h-48 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-inner relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-semibold">Generating QR...</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${table.name}`}
                className="w-full h-full object-contain select-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1 text-slate-400">
                <QrCode className="w-12 h-12 text-slate-300" />
                <span className="text-[10px] font-semibold">Unable to load</span>
              </div>
            )}
          </div>

          {/* Table Identifier & Call to Action */}
          <div className="mt-3 space-y-0.5">
            <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
              {table.name}
            </h3>
            <p className="text-[10px] font-semibold text-slate-500">
              {table.section} · {table.seats} Seats
            </p>
            <p className="text-[9px] font-bold text-orange-600 tracking-wide uppercase pt-1">
              Scan with camera to view menu & order
            </p>
          </div>
        </div>

        {/* URL Display with Copy Action */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Destination URL
            </p>
            <p className="text-xs font-mono font-medium text-slate-700 truncate" title={fullUrl}>
              {displayUrl}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Copy URL"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
            {onOpenMenu && (
              <button
                type="button"
                onClick={() => onOpenMenu(table.id)}
                className="p-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Test Menu in New Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="text-[10px]">Test</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={loading || !qrDataUrl}
            icon={<Download className="w-4 h-4 text-slate-600" />}
          >
            Download QR
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={loading || !qrDataUrl}
            icon={<Printer className="w-4 h-4 text-slate-600" />}
          >
            Print QR
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
