'use client';
import fetchData from '@/utility/fetch';
import { isValidHttpUrls, isValidMails } from '@/utility/validation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

interface propsType {
  todayDate: string;
}

const Form: React.FC<propsType> = (props) => {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const NewLeadQuery: { current: boolean } = useRef(
    searchParams.get('new-lead') == 'true',
  );
  console.log('Ref', NewLeadQuery.current);
  const [reportData, setReportData] = useState({
    callingDate: props.todayDate,
    followupDate: '',
    country: '',
    website: '',
    category: '',
    company: '',
    contactPerson: '',
    contactNumber: '',
    designation: '',
    email: '',
    status: '',
    linkedin: '',
    testJob: false,
    prospecting: false,
    prospectingStatus: '',
    followupDone: false,
    leadOrigin: 'generated',
    newLead: NewLeadQuery?.current ?? false,
  });

  const inputValidations = (reportData: any) => {
    const containsUrl = (text: string) => {
      const words = text.split(' ');
      return words.some((word) => isValidHttpUrls(word));
    };

    // check if all required fields are filled
    if (
      reportData.country === '' ||
      reportData.website === '' ||
      reportData.category === '' ||
      reportData.company === '' ||
      reportData.contactPerson === '' ||
      reportData.designation === ''
    ) {
      toast.error('All required fields must be filled');
      return false;
    }

    // check if website and linkedin are valid urls
    if (reportData.website && !isValidHttpUrls(reportData.website)) {
      toast.error('Invalid website URL');
      return false;
    }

    if (reportData.linkedin && !isValidHttpUrls(reportData.linkedin)) {
      toast.error('Invalid linkedin URL');
      return false;
    }

    // check country, company, category, contact person, designation are not a link
    if (containsUrl(reportData.country)) {
      toast.error('Country cannot be a URL');
      return false;
    }

    if (containsUrl(reportData.company)) {
      toast.error('Company name cannot be a URL');
      return false;
    }

    if (containsUrl(reportData.category)) {
      toast.error('Category cannot be a URL');
      return false;
    }

    if (containsUrl(reportData.contactPerson)) {
      toast.error('Contact person name cannot be a URL');
      return false;
    }

    if (containsUrl(reportData.designation)) {
      toast.error('Designation cannot be a URL');
      return false;
    }

    // check if email is valid
    if (reportData.email && !isValidMails(reportData.email)) {
      toast.error('Invalid email address');
      return false;
    }

    return true;
  };

  const handleAddNewReportFormSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();

      if (!reportData.followupDone && reportData.followupDate === '') {
        toast.error(
          'Followup date is required because followup is set as pending for the report',
        );
        return;
      }

      if (!inputValidations(reportData)) {
        return;
      }

      setLoading(true);

      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL + '/api/report?action=add-new-report';
      let options: {} = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        setReportData({
          callingDate: props.todayDate,
          followupDate: '',
          country: '',
          website: '',
          category: '',
          company: '',
          contactPerson: '',
          contactNumber: '',
          designation: '',
          email: '',
          status: '',
          linkedin: '',
          testJob: false,
          prospecting: false,
          prospectingStatus: '',
          followupDone: false,
          leadOrigin: 'generated',
          newLead: NewLeadQuery?.current ?? false,
        });
        toast.success('New report added successfully');
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while submitting the form');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const { name, type, value } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;

      if (name == 'followupDone') {
        setReportData((prevData) => ({
          ...prevData,
          followupDone: !checked, // to mark as pending, followup_done should be false when checked
        }));
      } else {
        setReportData((prevData) => ({
          ...prevData,
          [name]: checked,
        }));
      }

      if (!checked && name === 'prospecting')
        setReportData((prevData) => ({
          ...prevData,
          prospectingStatus: '',
        }));
    } else {
      setReportData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  return (
    <form onSubmit={handleAddNewReportFormSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
        <div className="">
          <label
            className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2"
            htmlFor="grid-first-name"
          >
            Calling Date
            <span className="cursor-pointer has-tooltip">
              &#9432;
              <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2">
                Filled automatically
              </span>
            </span>
          </label>

          <input
            disabled
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            value={props.todayDate}
            type="date"
            name="callingDate"
            onChange={handleChange}
            required
          />
        </div>
        <div className="">
          <label
            className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2"
            htmlFor="grid-last-name"
          >
            Followup Date
          </label>
          <input
            required={!reportData.followupDone}
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            value={reportData.followupDate}
            name="followupDate"
            onChange={handleChange}
            type="date"
          />
        </div>
        <div className="">
          <label
            className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2"
            htmlFor="grid-password"
          >
            Country*
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="country"
            value={reportData.country}
            onChange={handleChange}
            type="text"
            required
            placeholder="Company's country name"
          />
        </div>
        <div className="">
          <label
            className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2"
            htmlFor="grid-password"
          >
            Website*
            <span className="cursor-pointer has-tooltip">
              &#9432;
              <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2">
                Separated by space
              </span>
            </span>
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="website"
            value={reportData.website}
            onChange={handleChange}
            type="text"
            required
            placeholder="Company's website link"
          />
        </div>
        <div className="">
          <label
            className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2"
            htmlFor="grid-password"
          >
            Category*
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="category"
            value={reportData.category}
            onChange={handleChange}
            type="text"
            required
            placeholder="Company's category"
          />
        </div>
        <div className="">
          <label
            className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2"
            htmlFor="grid-password"
          >
            Company*
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="company"
            value={reportData.company}
            onChange={handleChange}
            type="text"
            required
            placeholder="Company's name"
          />
        </div>
        <div className="">
          <label
            className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2"
            htmlFor="grid-password"
          >
            Contact Person*
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="contactPerson"
            value={reportData.contactPerson}
            onChange={handleChange}
            type="text"
            required
            placeholder="Contact person's name"
          />
        </div>
        <div className="">
          <label
            className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2"
            htmlFor="grid-password"
          >
            Contact Number
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="contactNumber"
            value={reportData.contactNumber}
            onChange={handleChange}
            type="text"
            placeholder="Contact number"
          />
        </div>
        <div className="">
          <label
            className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2"
            htmlFor="grid-password"
          >
            Designation*
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="designation"
            value={reportData.designation}
            onChange={handleChange}
            type="text"
            required
            placeholder="Contact person's designation"
          />
        </div>
        <div className="">
          <label
            className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2"
            htmlFor="grid-password"
          >
            Email address
            <span className="cursor-pointer has-tooltip">
              &#9432;
              <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2">
                Separated by <span>&ldquo; / &rdquo;</span>
              </span>
            </span>
          </label>
          <input
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="email"
            value={reportData.email}
            onChange={handleChange}
            type="text"
            placeholder="Contact person's/company's email"
          />
        </div>
        <div className="">
          <label
            className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2"
            htmlFor="grid-password"
          >
            Status
          </label>
          <textarea
            rows={5}
            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            name="status"
            value={reportData.status}
            onChange={handleChange}
            placeholder="Calling status/feedback/update"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <label
              className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2"
              htmlFor="grid-password"
            >
              Linkedin
              <span className="cursor-pointer has-tooltip">
                &#9432;
                <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2">
                  Separated by space
                </span>
              </span>
            </label>
            <input
              className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              type="text"
              name="linkedin"
              value={reportData.linkedin}
              onChange={handleChange}
              placeholder="Contact person's/company's linkedin link"
            />
          </div>
          {reportData.prospecting && (
            <div>
              <label
                className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2"
                htmlFor="grid-last-name"
              >
                Prospect Status
              </label>
              <select
                value={reportData.prospectingStatus}
                onChange={(e) =>
                  setReportData((prevData) => ({
                    ...prevData,
                    prospectingStatus: e.target.value,
                  }))
                }
                // defaultValue={''}
                required
                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              >
                <option value={''} className="text-gray-400">
                  Select prospect status
                </option>
                <option value="high_interest">High Interest</option>
                <option value="low_interest">Low Interest</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="checkboxes flex flex-col sm:flex-row gap-4 mt-4">
        <div className="flex gap-2 items-center">
          <input
            name="testJob"
            checked={reportData.testJob}
            onChange={handleChange}
            id="test-job-checkbox"
            type="checkbox"
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="test-job-checkbox" className="uppercase ">
            Test Job
          </label>
        </div>

        <div className="flex gap-2 items-center">
          <input
            name="prospecting"
            checked={reportData.prospecting}
            onChange={handleChange}
            id="prospecting-checkbox"
            type="checkbox"
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="prospecting-checkbox" className="uppercase ">
            Prospecting
          </label>
        </div>

        <div className="flex gap-2 items-center">
          <input
            name="followupDone"
            checked={!reportData.followupDone}
            onChange={handleChange}
            id="prospect-interested-checkbox"
            type="checkbox"
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="prospect-interested-checkbox" className="uppercase ">
            Followup Pending
          </label>
        </div>

        <div className="flex gap-2 items-center">
          <input
            name="newLead"
            checked={reportData.newLead ?? NewLeadQuery.current}
            onChange={handleChange}
            id="new-lead-checkbox"
            type="checkbox"
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="new-lead-checkbox" className="uppercase ">
            New Lead
          </label>
        </div>
      </div>

      <button
        className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit this report'}
      </button>
    </form>
  );
};

export default Form;
