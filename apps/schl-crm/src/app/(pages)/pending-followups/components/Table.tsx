'use client';

import CallingStatusTd from '@/components/ExtendableTd';
import Linkify from '@/components/Linkify';
import Pagination from '@/components/Pagination';
import { getObjectChanges } from '@/lib/utils';
import { ReportDataType } from '@/models/Reports';
import countDaysSinceLastCall from '@/utility/countDayPassed';
import { YYYY_MM_DD_to_DD_MM_YY as convertToDDMMYYYY } from '@/utility/date';
import fetchData from '@/utility/fetch';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';
import FollowupDoneButton from './FollowupDone';

type ReportsState = {
  pagination: {
    count: number;
    pageCount: number;
  };
  items: ReportDataType[];
};

const Table = () => {
  const [reports, setReports] = useState<ReportsState>({
    pagination: {
      count: 0,
      pageCount: 0,
    },
    items: [],
  });

  const router = useRouter();

  const [isFiltered, setIsFiltered] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(0);
  const [itemPerPage, setItemPerPage] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [followupCountForToday, setFollowupCountForToday] = useState<number>(0);

  const prevPageCount = useRef<number>(0);
  const prevPage = useRef<number>(1);

  const { data: session } = useSession();

  const [filters, setFilters] = useState({
    country: '',
    companyName: '',
    category: '',
    fromDate: '',
    toDate: '',
    test: false,
    prospect: false,
    generalSearchString: '',
  });

  async function getAllReports() {
    try {
      // setIsLoading(true);

      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL + '/api/report?action=get-all-reports';
      let options: {} = {
        method: 'POST',
        headers: {
          filtered: false,
          paginated: true,
          item_per_page: itemPerPage,
          page,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followupDone: false,
          regularClient: false,
          marketerName: session?.user.provided_name,
        }),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        setReports(response.data);
        setIsFiltered(false);
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while retrieving reports data');
    } finally {
      setIsLoading(false);
    }
  }

  async function getAllReportsFiltered() {
    try {
      // setIsLoading(true);

      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL + '/api/report?action=get-all-reports';
      let options: {} = {
        method: 'POST',
        headers: {
          filtered: true,
          paginated: true,
          item_per_page: itemPerPage,
          page: !isFiltered ? 1 : page,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          followupDone: false,
          regularClient: false,
          marketerName: session?.user.provided_name,
        }),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        setReports(response.data);
        setIsFiltered(true);
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while retrieving reports data');
    } finally {
      setIsLoading(false);
    }
    return;
  }

  async function deleteReport(reportData: ReportDataType) {
    try {
      let url: string =
        process.env.NEXT_PUBLIC_PORTAL_URL + '/api/approval?action=new-request';
      let options: {} = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_model: 'Report',
          action: 'delete',
          object_id: reportData._id,
          deleted_data: reportData,
          req_by: session?.user.db_id,
        }),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        toast.success('Request sent for approval');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while sending request for approval');
    }
    return;
  }

  async function editReport(
    editedReportData: Partial<ReportDataType>,
    isRecall: boolean,
    previousReportData: ReportDataType,
    setEditedData: React.Dispatch<
      React.SetStateAction<Partial<ReportDataType>>
    >,
    setIsRecall: React.Dispatch<React.SetStateAction<boolean>>,
  ) {
    try {
      // setIsLoading(true);

      const recallLimit = Infinity;
      const lastCallDaysCap = 0;

      const lastCallDate =
        editedReportData.calling_date_history?.[
          editedReportData.calling_date_history.length - 2
        ];

      const daysPassedSinceLastCall = countDaysSinceLastCall(
        new Date(lastCallDate || ''),
      );

      const isRecallAllowed =
        daysPassedSinceLastCall > lastCallDaysCap ||
        session?.user.role === 'super' ||
        session?.user.role === 'admin';

      if (
        !editedReportData.followup_done &&
        editedReportData.followup_date === ''
      ) {
        toast.error(
          'Followup date is required because followup is set as pending for this report',
        );
        setEditedData({
          ...previousReportData,
          updated_by: session?.user.real_name || '',
        });
        setIsLoading(false);
        return;
      }

      if (isRecall) {
        if (isRecallAllowed) {
          const recallCountUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/report?action=get-recall-count`;
          const recallCount = await fetchData(recallCountUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              name: session?.user.provided_name,
            },
          });

          if (recallCount.ok) {
            if (recallCount.data < recallLimit) {
              const today = moment().utc().format('YYYY-MM-DD');

              const isFollowup = reports.items.find(
                (data) =>
                  data.followup_date === today &&
                  data._id === editedReportData._id,
              );

              if (isFollowup) {
                const editReportUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/report?action=edit-report`;

                const editOptions = {
                  method: 'POST',
                  body: JSON.stringify({
                    ...editedReportData,
                    updated_by: session?.user.real_name,
                  }),
                  headers: {
                    'Content-Type': 'application/json',
                  },
                };

                const response = await fetchData(editReportUrl, editOptions);

                if (response.ok) {
                  if (!isFiltered) await getAllReports();
                  else await getAllReportsFiltered();

                  toast.success('Edited the report successfully');
                  setEditedData({});
                  setIsRecall(false);
                } else {
                  toast.error(response.data);
                }
              } else {
                const submitData = {
                  target_model: 'Report',
                  action: 'update',
                  object_id: previousReportData._id,
                  changes: getObjectChanges(
                    previousReportData,
                    editedReportData,
                  ),
                  req_by: session?.user.db_id,
                };

                const approvalUrl: string =
                  process.env.NEXT_PUBLIC_PORTAL_URL +
                  '/api/approval?action=new-request';

                const approvalOptions = {
                  method: 'POST',
                  body: JSON.stringify(submitData),
                  headers: {
                    'Content-Type': 'application/json',
                  },
                };

                const response = await fetchData(approvalUrl, approvalOptions);

                setEditedData({});
                setIsRecall(false);

                if (response.ok) {
                  toast.success(
                    'Today is not the followup date of the report to recall, an approval request has been sent to admin',
                  );
                } else {
                  toast.error(response.data.message);
                }
              }
            } else {
              toast.error(
                'You have reached the limit of recall requests, please contact an admin!',
              );
              setEditedData({});
              setIsLoading(false);
              return;
            }
          } else {
            toast.error(recallCount.data);
          }
        } else {
          toast.error(
            `You have to wait ${lastCallDaysCap} days from your last call to make a call again or contact an admin!`,
          );
        }
      } else {
        const editReportUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/report?action=edit-report`;
        const editOptions = {
          method: 'POST',
          body: JSON.stringify(editedReportData),
          headers: {
            'Content-Type': 'application/json',
          },
        };

        const response = await fetchData(editReportUrl, editOptions);

        if (response.ok) {
          if (!isFiltered) await getAllReports();
          else await getAllReportsFiltered();

          toast.success('Edited the report successfully');
        } else {
          toast.error(response.data);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while editing the report');
    } finally {
      setEditedData({
        ...previousReportData,
        updated_by: session?.user.real_name || '',
      });
      setIsLoading(false);
    }
  }

  async function doneFollowup(reportId: string, reqBy: string) {
    try {
      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL + '/api/report?action=done-followup';
      let options: {} = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: reportId,
          req_by: reqBy,
        }),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        if (!isFiltered) await getAllReports();
        else await getAllReportsFiltered();

        toast.success(
          'The followup status has been marked as done successfully',
        );
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        'An error occurred while changing the status of the followup',
      );
    }
  }

  async function getFollowupCountForToday() {
    try {
      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL +
        '/api/report?action=get-followup-count-for-today';
      let options: {} = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          name: session?.user.provided_name,
        },
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        setFollowupCountForToday(response.data);
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while retrieving followup count data');
    }
  }

  useEffect(() => {
    getAllReports();
    getFollowupCountForToday();
  }, []);

  useEffect(() => {
    if (prevPage.current !== 1 || page > 1) {
      if (reports?.pagination?.pageCount == 1) return;
      if (!isFiltered) getAllReports();
      else getAllReportsFiltered();
    }
    prevPage.current = page;
  }, [page]);

  useEffect(() => {
    if (reports?.pagination?.pageCount !== undefined) {
      setPage(1);
      if (prevPageCount.current !== 0) {
        if (!isFiltered) getAllReportsFiltered();
      }
      if (reports) setPageCount(reports?.pagination?.pageCount);
      prevPageCount.current = reports?.pagination?.pageCount;
      prevPage.current = 1;
    }
  }, [reports?.pagination?.pageCount]);

  useEffect(() => {
    // Reset to first page when itemPerPage changes
    prevPageCount.current = 0;
    prevPage.current = 1;
    setPage(1);

    if (!isFiltered) getAllReports();
    else getAllReportsFiltered();
  }, [itemPerPage]);

  return (
    <>
      <div className="flex flex-col sm:items-center sm:flex-row justify-between mb-4 gap-2">
        <p className="text-xl text-center bg-gray-100 w-full sm:w-fit border-2 px-3.5 py-2 rounded-md">
          You have
          <span className="font-mono px-1.5 font-semibold">
            {followupCountForToday}
          </span>
          followups to do today!
        </p>
        <div className="items-center flex gap-2">
          <Pagination
            pageCount={pageCount}
            page={page}
            setPage={setPage}
            isLoading={isLoading}
          />

          <select
            value={itemPerPage}
            onChange={(e) => setItemPerPage(parseInt(e.target.value))}
            // defaultValue={30}
            required
            className="appearance-none bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
          >
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <FilterButton
            isLoading={isLoading}
            submitHandler={getAllReportsFiltered}
            setFilters={setFilters}
            filters={filters}
            className="w-full justify-between sm:w-auto"
          />
        </div>
      </div>

      {isLoading ? <p className="text-center">Loading...</p> : <></>}

      {!isLoading &&
        (reports?.items?.length !== 0 ? (
          <div className="table-responsive text-nowrap text-sm">
            <table className="table">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Calling Date</th>
                  <th>Followup Date</th>
                  <th>Country</th>
                  <th>Website</th>
                  <th>Category</th>
                  <th>Company Name</th>
                  <th>Contact Person</th>
                  <th>Designation</th>
                  <th>Contact Number</th>
                  <th>Email Address</th>
                  <th>Calling Status</th>
                  <th>LinkedIn</th>
                  <th>Test</th>
                  <th>Prospected</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {reports?.items?.map((item, index) => {
                  let tableRowColor = 'table-secondary';

                  if (item.is_prospected) {
                    if (item?.prospect_status == 'high_interest') {
                      tableRowColor = 'table-success';
                    } else if (item?.prospect_status == 'low_interest') {
                      tableRowColor = 'table-warning';
                    }
                  } else {
                    tableRowColor = 'table-danger';
                  }

                  return (
                    <tr
                      key={String(item._id)}
                      className={tableRowColor ? tableRowColor : ''}
                    >
                      <td>{index + 1 + itemPerPage * (page - 1)}</td>
                      <td>
                        {item.calling_date &&
                          convertToDDMMYYYY(item.calling_date)}
                      </td>
                      <td>
                        {item.followup_date &&
                          convertToDDMMYYYY(item.followup_date)}
                      </td>

                      <td>{item.country}</td>
                      <td>
                        {item.website.length ? (
                          <Linkify
                            coverText="Click here to visit"
                            data={item.website.trim()}
                          />
                        ) : (
                          'No link provided'
                        )}
                      </td>
                      <td>{item.category}</td>
                      <td className="text-wrap">{item.company_name}</td>
                      <td className="text-wrap">{item.contact_person}</td>
                      <td>{item.designation}</td>
                      <td className="text-wrap">{item.contact_number}</td>
                      <td className="text-wrap">{item.email_address}</td>
                      <CallingStatusTd data={item.calling_status} />
                      <td>
                        {item.linkedin.length ? (
                          <Linkify
                            coverText="Click here to visit"
                            data={item.linkedin.trim()}
                          />
                        ) : (
                          'No link provided'
                        )}
                      </td>
                      <td>
                        {item.test_given_date_history?.length ? 'Yes' : 'No'}
                      </td>
                      <td>
                        {item.is_prospected
                          ? `Yes (${item.followup_done ? 'Done' : 'Pending'})`
                          : 'No'}
                      </td>
                      <td
                        className="text-center"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <div className="inline-block">
                          <div className="flex gap-2">
                            <EditButton
                              isLoading={isLoading}
                              submitHandler={editReport}
                              reportData={item}
                            />
                            <DeleteButton
                              submitHandler={deleteReport}
                              reportData={item}
                            />
                            <FollowupDoneButton
                              submitHandler={doneFollowup}
                              reportData={item}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <tr key={0}>
            <td colSpan={16} className=" align-center text-center">
              No Reports To Show.
            </td>
          </tr>
        ))}
      <style jsx>
        {`
          th,
          td {
            padding: 2.5px 10px;
          }
        `}
      </style>
    </>
  );
};

export default Table;
