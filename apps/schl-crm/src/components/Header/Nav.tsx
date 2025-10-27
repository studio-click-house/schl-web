'use client';

import cn from '@/utility/cn';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
interface PropsType {
  msg?: string | undefined;
  className?: string | undefined;
}

const Nav: React.FC<PropsType> = (props) => {
  const { data: session } = useSession();

  let { msg = 'Welcome, ' + session?.user.provided_name + '!' } = props;
  let pathname = usePathname();

  console.log(pathname);

  return (
    <div
      className={`w-full flex flex-row align-middle items-center justify-between bg-black px-5 text-white ${props.className}`}
    >
      <div className="flex flex-row">
        <Link
          className={cn(
            'py-3 px-5',
            pathname == '/' ? 'bg-primary' : 'hover:opacity-90',
          )}
          href={'/'}
        >
          Statistics
        </Link>
        <Link
          className={cn(
            'py-3 px-5',
            pathname == '/call-reports' ? 'bg-primary' : 'hover:opacity-90',
          )}
          href={'/call-reports'}
        >
          Call Reports
        </Link>
        <Link
          className={cn(
            'py-3 px-5',
            pathname == '/lead-records' ? 'bg-primary' : 'hover:opacity-90',
          )}
          href={'/lead-records'}
        >
          Lead Records
        </Link>
        <Link
          className={cn(
            'py-3 px-5',
            pathname == '/pending-followups'
              ? 'bg-primary'
              : 'hover:opacity-90',
          )}
          href={'/pending-followups'}
        >
          Pending Followups
        </Link>
        <Link
          className={cn(
            'py-3 px-5',
            pathname.includes('/notices') ? 'bg-primary' : 'hover:opacity-90',
          )}
          href={'/notices'}
        >
          Notices
        </Link>
        <Link
          className={cn(
            'py-3 px-5',
            pathname == '/rules-and-regulations'
              ? 'bg-primary'
              : 'hover:opacity-90',
          )}
          href={'/rules-and-regulations'}
        >
          Rules & Regulations
        </Link>
        <Link
          className={cn(
            'py-3 px-5',
            pathname == '/email-verify' ? 'bg-primary' : 'hover:opacity-90',
          )}
          href={'/email-verify'}
        >
          Email Verify
        </Link>
      </div>

      <span className="max-lg:hidden">{msg}</span>
    </div>
  );
};
export default Nav;
