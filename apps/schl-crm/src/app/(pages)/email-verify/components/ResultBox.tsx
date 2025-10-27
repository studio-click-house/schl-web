'use client';

import Badge from '@/components/Badge';
import { daysToYMD } from '@/utility/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';
import { useValidation } from '../context/ValidationContext';

const ResultBox: React.FC = () => {
  const {
    validationResults,
    currentEmailIndex,
    nextEmail,
    prevEmail,
    getCurrentEmail,
  } = useValidation();

  const currentEmail = getCurrentEmail();

  if (!currentEmail || validationResults.length === 0) {
    return null;
  }

  const getVerdictColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid':
        return 'border-green-400 bg-green-100 text-green-800';
      case 'invalid':
        return 'border-red-400 bg-red-100 text-red-800';
      case 'catch-all':
        return 'border-yellow-400 bg-yellow-100 text-yellow-800';
      case 'unknown':
        return 'border-gray-400 bg-gray-100 text-gray-800';
      case 'do_not_mail':
        return 'border-red-400 bg-red-100 text-red-800';
      default:
        return 'border-gray-400 bg-gray-100 text-gray-800';
    }
  };

  const formattedDomainAge = () => {
    if (!currentEmail.domain_age_days) return 'N/A';
    const { years, months, days } = daysToYMD(currentEmail.domain_age_days);
    return `${years} years, ${months} months, ${days} days`;
  };

  const getVerdictText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'catch-all':
        return 'Catch-All';
      case 'unknown':
        return 'Unknown';
      case 'do_not_mail':
        return 'Do Not Mail';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header with email and navigation */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-sm font-medium text-gray-700">E-MAIL:</span>
          <span className="text-sm text-gray-900 break-all sm:break-normal">
            {currentEmail.address}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevEmail}
            disabled={currentEmailIndex === 0}
            className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextEmail}
            disabled={currentEmailIndex === validationResults.length - 1}
            className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="table-responsive text-nowrap text-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                Verdict
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                Domain
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                MX Found
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                MX Record
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                SMTP Provider
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                Free Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                Typo
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200">
                Domain Age
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-8 border-r border-gray-200">
                <Badge
                  value={getVerdictText(currentEmail.status)}
                  className={`${getVerdictColor(currentEmail.status)}`}
                />
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.domain}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.sub_status || currentEmail.status}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.mx_found ? 'Yes' : 'No'}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.mx_record || 'N/A'}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.smtp_provider || 'N/A'}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.free_email ? 'Yes' : 'No'}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {currentEmail.did_you_mean || 'N/A'}
              </td>
              <td className="px-4 py-8 text-sm text-gray-900 border-r border-gray-200">
                {formattedDomainAge()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Navigation indicator */}
      {validationResults.length > 1 && (
        <div className="bg-gray-100 px-4 py-2 text-center text-xs text-gray-600 font-mono">
          {currentEmailIndex + 1} of {validationResults.length} emails
        </div>
      )}
    </div>
  );
};

export default ResultBox;
