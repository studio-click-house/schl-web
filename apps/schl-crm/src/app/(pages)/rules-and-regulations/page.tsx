import React from 'react';

const RnR = () => {
  return (
    <div className="container my-5 mt-5 h-100 md:mt-[15vh]">
      <div className="my-5 text-center">
        <h1 className="mb-0 text-3xl">Office Rules and Regulations</h1>
        <p className="text-lg">April, 2024</p>
      </div>

      <div className="prose ml-5">
        <ul className="mb-5 text-xl list-decimal" role="list">
          <li>Punctuality is key.</li>
          <li>Every employee will undergo 5 tests each month.</li>
          <li>
            If an employee does not achieve the target of 5 tests, a deduction
            of 500 takas will be applied for each test not completed from their
            monthly commission. If the employee does not have a monthly
            commission, the deduction will be made from their regular
            client&apos;s commission, which they will receive after 4 months.
          </li>
          <li>
            A 10% commission will be applicable on amounts exceeding $100.
          </li>
          <li>
            Each employee must make calls to 60 individuals daily, find 10 new
            leads, and follow up with those previously contacted.
          </li>
          <li>
            Marketing employees will receive commissions every 4 months, solely
            based on regular client&apos;s contributions (irregular or
            quarterly-based not applicable), such as ITS, WoodWood, THOD.
          </li>
          <li>
            Monthly incentives will be granted based on performance in 5 tests,
            and the best seller will be recognized.
          </li>
          <li>
            The royalty commission after 4 months is not set at a fixed
            percentage; it will be determined based on the company&apos;s
            incurred expenses.
          </li>
        </ul>
      </div>

      <p className="font-mono text-xl">
        Please maintain a focused atmosphere in the marketing room by avoiding
        coffee/tea, games, and loud conversations. Disruptive behaviour may lead
        to immediate unpaid leave.
      </p>
      <p className="font-mono text-red-600 text-xl">
        All employees are expected to adhere to the above guidelines.
      </p>
    </div>
  );
};

export default RnR;
