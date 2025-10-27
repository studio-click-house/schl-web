import moment from 'moment-timezone';
import React, { Suspense } from 'react';
import InputForm from './components/Form';
import ResultBox from './components/ResultBox';
import { ValidationProvider } from './context/ValidationContext';

const ValidatorPage = () => {
  let todayDate: string = moment().format('YYYY-MM-DD');

  return (
    <ValidationProvider>
      <div className="px-4 mt-4 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
        <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
          Validate a new E-mail
        </h1>
        <Suspense fallback={<p className="text-center">Loading...</p>}>
          <InputForm />
        </Suspense>

        {/* Results section */}
        <div className="mt-6">
          <ResultBox />
        </div>
      </div>
    </ValidationProvider>
  );
};

export default ValidatorPage;
