'use client';

import Pagination from '@/components/Pagination';
import { ISO_to_DD_MM_YY as convertToDDMMYYYY } from '@/utility/date';
import fetchData from '@/utility/fetch';
import moment from 'moment-timezone';
import { useRouter } from 'nextjs-toploader/app';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import FilterButton from './Filter';

type NoticesState = {
  pagination: {
    count: number;
    pageCount: number;
  };
  items: { [key: string]: any }[];
};

const Table = () => {
  const [notices, setNotices] = useState<NoticesState>({
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

  const prevPageCount = useRef<number>(0);
  const prevPage = useRef<number>(1);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    noticeNo: '',
    title: '',
  });

  async function getAllNotices() {
    try {
      // setIsLoading(true);

      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL + '/api/notice?action=get-all-notices';
      let options: {} = {
        method: 'POST',
        headers: {
          filtered: false,
          paginated: true,
          item_per_page: itemPerPage,
          page,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: 'marketers' }),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        setNotices(response.data);
        setIsFiltered(false);
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while retrieving notices data');
    } finally {
      setIsLoading(false);
    }
  }

  async function getAllNoticesFiltered() {
    try {
      // setIsLoading(true);

      let url: string =
        process.env.NEXT_PUBLIC_BASE_URL + '/api/notice?action=get-all-notices';
      let options: {} = {
        method: 'POST',
        headers: {
          filtered: true,
          paginated: true,
          item_per_page: itemPerPage,
          page: !isFiltered ? 1 : page,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...filters, channel: 'marketers' }),
      };

      let response = await fetchData(url, options);

      if (response.ok) {
        setNotices(response.data);
        setIsFiltered(true);
      } else {
        toast.error(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while retrieving notices data');
    } finally {
      setIsLoading(false);
    }
    return;
  }

  useEffect(() => {
    getAllNotices();
  }, []);

  useEffect(() => {
    if (prevPage.current !== 1 || page > 1) {
      if (notices?.pagination?.pageCount == 1) return;
      if (!isFiltered) getAllNotices();
      else getAllNoticesFiltered();
    }
    prevPage.current = page;
  }, [page]);

  useEffect(() => {
    if (notices?.pagination?.pageCount !== undefined) {
      setPage(1);
      if (prevPageCount.current !== 0) {
        if (!isFiltered) getAllNoticesFiltered();
      }
      if (notices) setPageCount(notices?.pagination?.pageCount);
      prevPageCount.current = notices?.pagination?.pageCount;
      prevPage.current = 1;
    }
  }, [notices?.pagination?.pageCount]);

  useEffect(() => {
    // Reset to first page when itemPerPage changes
    prevPageCount.current = 0;
    prevPage.current = 1;
    setPage(1);

    if (!isFiltered) getAllNotices();
    else getAllNoticesFiltered();
  }, [itemPerPage]);

  return (
    <>
      <div className="flex flex-col justify-center sm:flex-row sm:justify-end mb-4 gap-2">
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
            submitHandler={getAllNoticesFiltered}
            setFilters={setFilters}
            filters={filters}
            className="w-full justify-between sm:w-auto"
          />
        </div>
      </div>

      {isLoading ? <p className="text-center">Loading...</p> : <></>}

      {!isLoading &&
        (notices?.items?.length !== 0 ? (
          <div className="table-responsive text-nowrap ">
            <table className="table table-bordered table-striped">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Notice No</th>
                  <th>Title</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {notices?.items?.map((item, index) => {
                  return (
                    <tr key={item.notice_no}>
                      <td>{index + 1 + itemPerPage * (page - 1)}</td>
                      <td>
                        {item.createdAt
                          ? moment(
                              convertToDDMMYYYY(item.createdAt),
                              'DD-MM-YYYY',
                            ).format('D MMMM, YYYY')
                          : null}
                      </td>
                      <td>{item.notice_no}</td>
                      <td>{item.title}</td>
                      <td
                        className="text-center"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <div className="inline-block  py-1">
                          <button
                            onClick={() => {
                              router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                  `/notices/${encodeURIComponent(item.notice_no)}`,
                              );
                            }}
                            className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              className="w-5 h-5"
                            >
                              <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                              <path d="m21 3-9 9" />
                              <path d="M15 3h6v6" />
                            </svg>
                          </button>
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
            <td colSpan={5} className=" align-center text-center">
              No Notices To Show.
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
